import type { LLMRequest, LLMResponse } from '@sherpa/llm';
import type { ParsedIntent, Intent } from './types.js';

/**
 * Deterministic Stage-1 parser. Covers the most common natural-language
 * patterns without needing an LLM. `parseWithLLM` is the fallback used by
 * the API when the deterministic parser returns UNKNOWN.
 *
 * Contract:
 *   - The deterministic layer is conservative — anything ambiguous (multi-word
 *     recipients, prose like "vitalik dot eth", asset names spelled funny)
 *     deliberately falls through to UNKNOWN so `parseWithLLM` can take it.
 *   - Recipient is captured as a single `\S+` token. We do NOT normalise
 *     "dot" → "." here; the LLM owns the looser cases.
 *   - All matches are case-insensitive and `$?` on amounts is optional.
 *
 * Supported forms:
 *   SEND     "send 5 usdc to 0x… / @handle / name.base.eth / name.eth"
 *            "5 usdc to <recipient>" / "5 to <recipient>"  (verbless)
 *   BET      "bet $5 on …"
 *   BUY      "buy $50 of eth" / "buy eth for $50"          (either order)
 *   DEPOSIT  "deposit $50" / "fund $50" / "top up 50"
 *   BALANCE  "balance" / "what's my balance" / "what is my balance" /
 *            "show my balance" / "show me my balance"
 *   HISTORY  "history" / "last N txs" / "my recent txs"
 *
 * Deliberately UNKNOWN (handed to the LLM):
 *   - "send 5 USDC to vitalik dot eth"  (multi-word recipient)
 *   - "send vitalik 5 USDC"             (indirect-object phrasing)
 *   - "I want to buy some ETH"          (prose)
 */

const SEND_RE = /^send\s+([\d.]+)\s*(usdc|eth)?\s+to\s+(\S+)\s*$/i;
// Verbless: "<amount> [asset] to <recipient>". Asset defaults to USDC like SEND_RE.
const SEND_NO_VERB_RE = /^([\d.]+)\s*(usdc|eth)?\s+to\s+(\S+)\s*$/i;
const BUY_RE = /^buy\s+\$?([\d.]+)\s+(?:of\s+)?(\w+)\s*$/i;
// Asset-first: "buy <asset> for $<amount>".
const BUY_FOR_RE = /^buy\s+(\w+)\s+for\s+\$?([\d.]+)\s*$/i;
const BET_RE = /^bet\s+\$?([\d.]+)\s+(.+?)\s*$/i;
const DEPOSIT_RE = /^(?:deposit|fund|add|top\s*up)\s+\$?([\d.]+)\s*(?:usdc|usd|dollars?)?\s*$/i;
// Accepts: "balance", "what's my balance", "what is my balance",
// "show my balance", "show me my balance", with optional "?".
const BALANCE_RE =
  /^(?:(?:what(?:[’']s|\s+is)\s+my\s+)|(?:show(?:\s+me)?\s+my\s+))?balance\??\s*$/i;
const HISTORY_RE =
  /^(?:show\s+)?(?:my\s+)?(?:last\s+(\d+)\s+)?(?:recent\s+)?(?:tx|txs|transactions|history)\s*$/i;

function make(
  intent: Intent,
  raw: string,
  slots: Record<string, unknown>,
  confidence: number,
): ParsedIntent {
  return { intent, raw, slots, confidence };
}

export function parseDeterministic(input: string): ParsedIntent {
  const raw = input.trim();

  let m: RegExpMatchArray | null;

  if ((m = raw.match(SEND_RE))) {
    return make(
      'SEND',
      raw,
      { amount: m[1], asset: (m[2] ?? 'USDC').toUpperCase(), to: m[3] },
      0.95,
    );
  }

  if ((m = raw.match(SEND_NO_VERB_RE))) {
    // "5 ETH to USDC" is a SWAP intent (Stage 2), not a SEND with USDC as a
    // recipient. When the captured recipient is a known asset symbol, bail
    // to UNKNOWN so the LLM (or future SWAP regex) can disambiguate.
    const to = m[3] ?? '';
    if (!/^(usdc|usd|eth|weth|btc|wbtc)$/i.test(to)) {
      return make(
        'SEND',
        raw,
        { amount: m[1], asset: (m[2] ?? 'USDC').toUpperCase(), to },
        0.85,
      );
    }
  }

  if ((m = raw.match(BUY_RE))) {
    return make('BUY', raw, { usd: m[1], asset: (m[2] ?? '').toUpperCase() }, 0.85);
  }

  if ((m = raw.match(BUY_FOR_RE))) {
    return make('BUY', raw, { usd: m[2], asset: (m[1] ?? '').toUpperCase() }, 0.85);
  }

  if ((m = raw.match(BET_RE))) {
    return make('BET', raw, { usd: m[1], predicate: m[2] ?? '' }, 0.75);
  }

  if ((m = raw.match(DEPOSIT_RE))) {
    return make('DEPOSIT', raw, { usd: m[1], asset: 'USDC' }, 0.9);
  }

  if (BALANCE_RE.test(raw)) {
    return make('BALANCE', raw, {}, 0.95);
  }

  if ((m = raw.match(HISTORY_RE))) {
    return make('HISTORY', raw, { limit: m[1] ? Number(m[1]) : 10 }, 0.9);
  }

  return make('UNKNOWN', raw, {}, 0);
}

/**
 * LLM-backed fallback. Asks the router for a strict JSON object describing
 * the intent + slots; rejects anything that doesn't validate. Caller is
 * expected to pass a router instance from `@sherpa/llm` (real or mock).
 */
export type LLMComplete = (req: LLMRequest) => Promise<LLMResponse>;

const VALID_INTENTS: readonly Intent[] = [
  'SEND',
  'BUY',
  'BET',
  'SWAP',
  'LEND',
  'DEPOSIT',
  'BALANCE',
  'HISTORY',
];

const PARSE_SYSTEM = `You translate a user's natural-language Web3 instruction into a strict JSON object.

Output ONLY a single JSON object, no prose, with this shape:
{ "intent": "SEND|BUY|BET|SWAP|DEPOSIT|BALANCE|HISTORY|UNKNOWN", "slots": { ... }, "confidence": 0..1 }

Slot conventions:
- SEND     { "amount": "5", "asset": "USDC", "to": "<address|handle|ens>" }
- BUY      { "usd": "50", "asset": "ETH" }
- BET      { "usd": "5", "predicate": "<text>", "outcome": "YES|NO" }
- DEPOSIT  { "usd": "50", "asset": "USDC" }
- BALANCE  {}
- HISTORY  { "limit": 10 }

If you cannot parse, return { "intent": "UNKNOWN", "slots": {}, "confidence": 0 }.`;

function safeParseJson(text: string): unknown {
  // The model may wrap the JSON in code fences. Strip them, then take the
  // first {...} block we find.
  const stripped = text
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(stripped.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function parseWithLLM(input: string, complete: LLMComplete): Promise<ParsedIntent> {
  const raw = input.trim();
  const det = parseDeterministic(raw);
  if (det.intent !== 'UNKNOWN') return det;

  const resp = await complete({ task: 'parse', system: PARSE_SYSTEM, user: raw });
  const json = safeParseJson(resp.text);
  if (!json || typeof json !== 'object') return make('UNKNOWN', raw, {}, 0);

  const obj = json as Record<string, unknown>;
  const intentRaw = typeof obj.intent === 'string' ? obj.intent.toUpperCase() : 'UNKNOWN';
  const intent = (VALID_INTENTS as readonly string[]).includes(intentRaw)
    ? (intentRaw as Intent)
    : 'UNKNOWN';
  const slots = obj.slots && typeof obj.slots === 'object' ? (obj.slots as Record<string, unknown>) : {};
  const confidence = typeof obj.confidence === 'number' ? Math.max(0, Math.min(1, obj.confidence)) : 0.5;

  return make(intent, raw, slots, confidence);
}
