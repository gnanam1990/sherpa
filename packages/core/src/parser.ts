import type { ParsedIntent, Intent } from './types.js';

/**
 * Deterministic Stage-1 parser. Covers the most common natural-language
 * patterns without needing an LLM — the LLM path (via `@sherpa/llm`) is wired
 * in `parseWithLLM` below for anything the deterministic rules miss.
 *
 * Supported forms:
 *   SEND     "send 5 usdc to 0x… / @handle / name.base.eth / name.eth"
 *   BET      "bet $5 on … / bet 5 on …"
 *   BUY      "buy $50 of eth"
 *   BALANCE  "balance" / "what's my balance" / "show my balance"
 *   HISTORY  "history" / "last N txs" / "my recent txs"
 */

const SEND_RE = /^send\s+([\d.]+)\s*(usdc|eth)?\s+to\s+(\S+)\s*$/i;
const BUY_RE = /^buy\s+\$?([\d.]+)\s+(?:of\s+)?(\w+)\s*$/i;
const BET_RE = /^bet\s+\$?([\d.]+)\s+(.+?)\s*$/i;
const BALANCE_RE = /^(?:what[’']?s\s+my\s+)?(?:show\s+my\s+)?balance\??\s*$/i;
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

  if ((m = raw.match(BUY_RE))) {
    return make('BUY', raw, { usd: m[1], asset: (m[2] ?? '').toUpperCase() }, 0.85);
  }

  if ((m = raw.match(BET_RE))) {
    return make('BET', raw, { usd: m[1], predicate: m[2] ?? '' }, 0.75);
  }

  if (BALANCE_RE.test(raw)) {
    return make('BALANCE', raw, {}, 0.95);
  }

  if ((m = raw.match(HISTORY_RE))) {
    return make('HISTORY', raw, { limit: m[1] ? Number(m[1]) : 10 }, 0.9);
  }

  return make('UNKNOWN', raw, {}, 0);
}
