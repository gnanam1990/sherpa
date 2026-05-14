import { describe, it, expect } from 'vitest';
import { parseDeterministic, parseWithLLM, plan } from './index.js';
import { createLimitless, makeUniswap } from '@sherpa/tools';
import { ALLOWED_CONTRACTS } from '@sherpa/safety';
import type { LLMResponse } from '@sherpa/llm';

const USDC_RECIPIENT = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

describe('core/parser', () => {
  it('parses SEND with 0x recipient', () => {
    const p = parseDeterministic(`send 5 usdc to ${USDC_RECIPIENT}`);
    expect(p.intent).toBe('SEND');
    expect(p.slots.amount).toBe('5');
    expect(p.slots.to).toBe(USDC_RECIPIENT);
  });

  it('parses BALANCE', () => {
    expect(parseDeterministic('balance').intent).toBe('BALANCE');
    expect(parseDeterministic("what's my balance?").intent).toBe('BALANCE');
  });

  it('parses HISTORY with limit', () => {
    const p = parseDeterministic('show my last 5 txs');
    expect(p.intent).toBe('HISTORY');
    expect(p.slots.limit).toBe(5);
  });

  it('returns UNKNOWN for unsupported inputs', () => {
    expect(parseDeterministic('marry me').intent).toBe('UNKNOWN');
  });

  // M1-week-2 parser hardening: phrasings the previous regex set missed.
  // Each case is either now deterministic or deliberately UNKNOWN (LLM owns).
  it('parses verbless SEND ("5 to vitalik.eth")', () => {
    const p = parseDeterministic('5 to vitalik.eth');
    expect(p.intent).toBe('SEND');
    expect(p.slots.amount).toBe('5');
    expect(p.slots.asset).toBe('USDC');
    expect(p.slots.to).toBe('vitalik.eth');
  });

  it('parses verbless SEND with asset ("5 usdc to 0x…")', () => {
    const p = parseDeterministic(`5 usdc to ${USDC_RECIPIENT}`);
    expect(p.intent).toBe('SEND');
    expect(p.slots.asset).toBe('USDC');
    expect(p.slots.to).toBe(USDC_RECIPIENT);
  });

  it('parses asset-first BUY ("buy ETH for $50")', () => {
    const p = parseDeterministic('buy ETH for $50');
    expect(p.intent).toBe('BUY');
    expect(p.slots.usd).toBe('50');
    expect(p.slots.asset).toBe('ETH');
  });

  it('parses BALANCE without apostrophe ("what is my balance")', () => {
    expect(parseDeterministic('what is my balance').intent).toBe('BALANCE');
    expect(parseDeterministic('WHAT IS MY BALANCE?').intent).toBe('BALANCE');
  });

  it('parses BALANCE "show me my balance"', () => {
    expect(parseDeterministic('show me my balance').intent).toBe('BALANCE');
  });

  it('returns UNKNOWN for multi-word recipients (LLM territory)', () => {
    // "vitalik dot eth" should NOT match SEND_RE — the recipient capture is a
    // single \S+ token by design. parseWithLLM picks this up.
    expect(parseDeterministic('send 5 USDC to vitalik dot eth').intent).toBe('UNKNOWN');
  });

  // Carry-over from PR #6: verbless SEND must not eat SWAP-shaped phrases.
  it('does NOT match "5 ETH to USDC" as a verbless SEND (SWAP territory)', () => {
    const p = parseDeterministic('5 ETH to USDC');
    expect(p.intent).toBe('UNKNOWN');
    expect(p.confidence).toBe(0);
  });

  // ── SWAP parsing ────────────────────────────────────────────────────

  it('parses "swap 100 USDC for ETH"', () => {
    const p = parseDeterministic('swap 100 USDC for ETH');
    expect(p.intent).toBe('SWAP');
    expect(p.slots.fromAmount).toBe('100');
    expect(p.slots.fromAsset).toBe('USDC');
    expect(p.slots.toAsset).toBe('ETH');
    expect(p.confidence).toBe(0.9);
  });

  it('parses "convert 0.5 ETH to USDC"', () => {
    const p = parseDeterministic('convert 0.5 ETH to USDC');
    expect(p.intent).toBe('SWAP');
    expect(p.slots.fromAmount).toBe('0.5');
    expect(p.slots.fromAsset).toBe('ETH');
    expect(p.slots.toAsset).toBe('USDC');
  });

  it('parses "trade 50 USDC to ETH"', () => {
    const p = parseDeterministic('trade 50 USDC to ETH');
    expect(p.intent).toBe('SWAP');
    expect(p.slots.fromAmount).toBe('50');
  });

  it('parses SWAP with arrow syntax ("swap 10 USDC → ETH")', () => {
    const p = parseDeterministic('swap 10 USDC → ETH');
    expect(p.intent).toBe('SWAP');
    expect(p.slots.fromAmount).toBe('10');
    expect(p.slots.toAsset).toBe('ETH');
  });

  it('parses SWAP with slippage suffix', () => {
    const p = parseDeterministic('swap 100 USDC for ETH with 1% slippage');
    expect(p.intent).toBe('SWAP');
    expect(p.slots.fromAmount).toBe('100');
    expect(p.slots.slippagePct).toBe(1);
  });

  it('parses SWAP case-insensitively', () => {
    const p = parseDeterministic('SWAP 100 USDC FOR ETH');
    expect(p.intent).toBe('SWAP');
    expect(p.slots.fromAsset).toBe('USDC');
  });

  it('parses SWAP with decimal amounts', () => {
    const p = parseDeterministic('swap 0.001 ETH for USDC');
    expect(p.intent).toBe('SWAP');
    expect(p.slots.fromAmount).toBe('0.001');
    expect(p.slots.fromAsset).toBe('ETH');
  });

  it('does NOT match incomplete SWAP ("swap USDC for ETH" — missing amount)', () => {
    const p = parseDeterministic('swap USDC for ETH');
    expect(p.intent).toBe('UNKNOWN');
  });

  it('does NOT match SWAP with missing toAsset ("swap 100 USDC")', () => {
    const p = parseDeterministic('swap 100 USDC');
    expect(p.intent).toBe('UNKNOWN');
  });

  // ── LEND parsing ────────────────────────────────────────────────────

  it('parses "lend 100 USDC"', () => {
    const p = parseDeterministic('lend 100 USDC');
    expect(p.intent).toBe('LEND');
    expect(p.slots.amount).toBe('100');
    expect(p.slots.asset).toBe('USDC');
    expect(p.confidence).toBe(0.9);
  });

  it('parses "supply 200 USDC"', () => {
    const p = parseDeterministic('supply 200 USDC');
    expect(p.intent).toBe('LEND');
    expect(p.slots.amount).toBe('200');
    expect(p.slots.asset).toBe('USDC');
  });

  it('parses "deposit 50 USDC to aave"', () => {
    const p = parseDeterministic('deposit 50 USDC to aave');
    expect(p.intent).toBe('LEND');
    expect(p.slots.amount).toBe('50');
    expect(p.slots.asset).toBe('USDC');
  });

  it('parses "deposit 100 USDC into aave"', () => {
    const p = parseDeterministic('deposit 100 USDC into aave');
    expect(p.intent).toBe('LEND');
    expect(p.slots.amount).toBe('100');
  });

  it('parses "deposit 75 USDC on aave"', () => {
    const p = parseDeterministic('deposit 75 USDC on aave');
    expect(p.intent).toBe('LEND');
  });

  it('parses "deposit 50 USDC in aave"', () => {
    const p = parseDeterministic('deposit 50 USDC in aave');
    expect(p.intent).toBe('LEND');
  });

  it('parses LEND case-insensitively', () => {
    const p = parseDeterministic('LEND 100 USDC');
    expect(p.intent).toBe('LEND');
  });

  it('parses LEND with decimal amounts', () => {
    const p = parseDeterministic('lend 0.5 USDC');
    expect(p.intent).toBe('LEND');
    expect(p.slots.amount).toBe('0.5');
  });

  it('does NOT parse "deposit 50" as LEND (missing asset and aave)', () => {
    const p = parseDeterministic('deposit 50');
    expect(p.intent).toBe('DEPOSIT');
  });

  it('does NOT parse "lend" without amount as LEND', () => {
    const p = parseDeterministic('lend USDC');
    expect(p.intent).toBe('UNKNOWN');
  });
});

describe('core/executor', () => {
  it('plans a SEND into a ConfirmationCardProps', async () => {
    const p = parseDeterministic(`send 5 usdc to ${USDC_RECIPIENT}`);
    const out = await plan(p);
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.card.intent).toBe('SEND');
      expect(out.card.primary_amount_display).toBe('5 USDC');
      expect(out.card.recipient_display).toBe(USDC_RECIPIENT);
      expect(out.card.steps.length).toBe(1);
    }
  });

  it('rejects amounts over the safety cap', async () => {
    const p = parseDeterministic(`send 9999 usdc to ${USDC_RECIPIENT}`);
    const out = await plan(p);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toMatch(/ring2_amount_cap/);
  });

  it('rejects a bad recipient', async () => {
    const p = parseDeterministic('send 5 usdc to garbage-handle');
    const out = await plan(p);
    expect(out.ok).toBe(false);
  });

  it('plans a BUY with approve+swap and an EIP-5792 envelope', async () => {
    const me = '0x1111111111111111111111111111111111111111' as const;
    const p = parseDeterministic('buy $50 of eth');
    // makeUniswap({ pyth: false }) keeps the test deterministic against the
    // 3000-USDC stub; the default uniswap adapter would call Pyth Hermes.
    const out = await plan(p, {
      userAddress: me,
      paymasterUrl: 'https://paymaster.test',
      uniswap: makeUniswap({ pyth: false }),
    });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.card.intent).toBe('BUY');
      expect(out.card.steps.length).toBe(2);
      expect(out.card.steps[0]?.kind).toBe('approve');
      expect(out.card.steps[1]?.kind).toBe('swap');
      expect(out.card.batch?.calls.length).toBe(2);
      expect(out.card.gas_display).toMatch(/sponsored/);
    }
  });

  it('BUY without userAddress is rejected', async () => {
    const p = parseDeterministic('buy $50 of eth');
    const out = await plan(p);
    expect(out.ok).toBe(false);
  });

  it('plans a DEPOSIT with onramp redirect_url', async () => {
    const me = '0x1111111111111111111111111111111111111111' as const;
    const p = parseDeterministic('deposit $50');
    expect(p.intent).toBe('DEPOSIT');
    const out = await plan(p, { userAddress: me });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.card.steps.length).toBe(0);
      expect(out.card.redirect_url).toContain('pay.coinbase.com');
      expect(out.card.warnings.length).toBeGreaterThan(0);
    }
  });

  it('refuses BET while Limitless Sepolia address is unconfigured', async () => {
    // M1-week-2: until LIMITLESS_FACTORY_ADDRESS is set in @sherpa/safety,
    // BET must surface a typed error rather than build a tx to a placeholder.
    const p = parseDeterministic('bet $5 yes on eth-tops-5k');
    const out = await plan(p);
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.error).toMatch(/not yet configured/i);
    }
  });

  // 2.3: end-to-end BET shape. Verifies the EIP-5792 envelope the API will
  // hand to the wallet — exactly two calls in order (USDC.approve, then
  // Limitless.buyOutcomeShares) and capabilities.paymasterService when a
  // paymaster URL is configured.
  it('plans a BET with a 2-call EIP-5792 batch and paymaster capability', async () => {
    const me = '0x1111111111111111111111111111111111111111' as const;
    const fakeFactory = '0xabababababababababababababababababababab' as const;
    const lim = createLimitless({ factoryAddress: fakeFactory });

    const p = parseDeterministic('bet $5 yes on eth-tops-5k');
    const out = await plan(p, {
      userAddress: me,
      paymasterUrl: 'https://paymaster.test',
      limitless: lim,
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;

    expect(out.card.intent).toBe('BET');
    expect(out.card.steps.length).toBe(2);
    expect(out.card.steps[0]?.kind).toBe('approve');
    expect(out.card.steps[1]?.kind).toBe('bet');

    // Batch shape: 2 calls, ordered approve → buy.
    expect(out.card.batch?.calls.length).toBe(2);
    const [approveCall, buyCall] = out.card.batch!.calls;
    expect(approveCall?.to.toLowerCase()).toBe(ALLOWED_CONTRACTS.USDC.toLowerCase());
    expect(approveCall?.data.startsWith('0x095ea7b3')).toBe(true); // approve selector
    expect(buyCall?.to.toLowerCase()).toBe(fakeFactory.toLowerCase());
    // buyOutcomeShares calldata is encoded; first 4 bytes (selector) +
    // 4×32-byte args = 4 + 128 = 132 bytes ⇒ "0x" + 264 hex chars.
    expect(buyCall?.data.length).toBe(2 + 132 * 2);
    // EIP-5792 envelopes carry value as hex string, not bigint.
    expect(buyCall?.value).toBe('0x0');
    expect(approveCall?.value).toBe('0x0');

    // Sponsorship capability is set when a paymaster URL is provided.
    expect(out.card.batch?.capabilities?.paymasterService?.url).toBe('https://paymaster.test');
    expect(out.card.gas_display).toMatch(/sponsored/);
  });

  it('omits paymasterService capability when no paymasterUrl is provided', async () => {
    const me = '0x1111111111111111111111111111111111111111' as const;
    const lim = createLimitless({
      factoryAddress: '0xabababababababababababababababababababab',
    });
    const p = parseDeterministic('bet $5 yes on eth-tops-5k');
    const out = await plan(p, { userAddress: me, limitless: lim });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.card.batch?.capabilities?.paymasterService).toBeUndefined();
    expect(out.card.gas_display).not.toMatch(/sponsored/);
  });

  // ── SWAP executor ───────────────────────────────────────────────────

  it('SWAP returns graceful error when Aerodrome not configured (default)', async () => {
    const me = '0x1111111111111111111111111111111111111111' as const;
    const p = parseDeterministic('swap 100 USDC for ETH');
    const out = await plan(p, { userAddress: me });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.error).toMatch(/available/i);
    }
  });

  it('SWAP rejects unknown fromAsset', async () => {
    const me = '0x1111111111111111111111111111111111111111' as const;
    const p = parseDeterministic('swap 100 DAI for ETH');
    const out = await plan(p, { userAddress: me });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.error).toMatch(/doesn't know about DAI/i);
    }
  });

  it('SWAP rejects unknown toAsset', async () => {
    const me = '0x1111111111111111111111111111111111111111' as const;
    const p = parseDeterministic('swap 100 USDC for SOL');
    const out = await plan(p, { userAddress: me });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.error).toMatch(/doesn't know about SOL/i);
    }
  });

  it('SWAP requires userAddress', async () => {
    const p = parseDeterministic('swap 100 USDC for ETH');
    const out = await plan(p);
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.error).toMatch(/connected wallet/i);
    }
  });

  it('SWAP rejects slippage below 0.1%', async () => {
    const me = '0x1111111111111111111111111111111111111111' as const;
    const p = parseDeterministic('swap 100 USDC for ETH with 0.05% slippage');
    const out = await plan(p, { userAddress: me });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.error).toMatch(/0\.1%/i);
    }
  });

  it('SWAP rejects same from/to asset', async () => {
    const me = '0x1111111111111111111111111111111111111111' as const;
    const p = parseDeterministic('swap 100 USDC for USDC');
    const out = await plan(p, { userAddress: me });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.error).toMatch(/differ/i);
    }
  });

  // ── LEND executor ───────────────────────────────────────────────────

  it('LEND returns graceful error when Aave not configured (default)', async () => {
    const me = '0x1111111111111111111111111111111111111111' as const;
    const p = parseDeterministic('lend 100 USDC');
    const out = await plan(p, { userAddress: me });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.error).toMatch(/available/i);
    }
  });

  it('LEND rejects unsupported asset', async () => {
    const me = '0x1111111111111111111111111111111111111111' as const;
    const p = parseDeterministic('lend 100 ETH');
    const out = await plan(p, { userAddress: me });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.error).toMatch(/doesn't support ETH/i);
    }
  });

  it('LEND requires userAddress', async () => {
    const p = parseDeterministic('lend 100 USDC');
    const out = await plan(p);
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.error).toMatch(/connected wallet/i);
    }
  });

  it('LEND plans with configured Aave adapter', async () => {
    const me = '0x1111111111111111111111111111111111111111' as const;
    const fakePool = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
    const { createAave } = await import('@sherpa/tools');
    const aaveAdapter = createAave({ poolAddress: fakePool });

    const p = parseDeterministic('lend 100 USDC');
    const out = await plan(p, {
      userAddress: me,
      paymasterUrl: 'https://paymaster.test',
      aave: aaveAdapter,
    });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.card.intent).toBe('LEND');
      expect(out.card.primary_amount_display).toBe('100 USDC');
      expect(out.card.steps.length).toBe(2);
      expect(out.card.steps[0]?.kind).toBe('approve');
      expect(out.card.steps[1]?.kind).toBe('custom');
      expect(out.card.batch?.calls.length).toBe(2);
      expect(out.card.gas_display).toMatch(/sponsored/);
      expect(out.card.secondary_amount_display).toContain('USDC');
    }
  });
});

describe('core/parseWithLLM', () => {
  const fakeUsage = { provider: 'gpt-4o-mini' as const, model: 'gpt-4o-mini', promptTokens: 1, completionTokens: 1, costUsd: 0, latencyMs: 0 };

  it('uses deterministic parse when it matches (no LLM call)', async () => {
    let called = 0;
    const llm = async (): Promise<LLMResponse> => {
      called += 1;
      return { text: '{}', usage: fakeUsage };
    };
    const out = await parseWithLLM('balance', llm);
    expect(out.intent).toBe('BALANCE');
    expect(called).toBe(0);
  });

  it('falls back to LLM and validates the JSON response', async () => {
    const llm = async (): Promise<LLMResponse> => ({
      text: '```json\n{"intent":"DEPOSIT","slots":{"usd":"25","asset":"USDC"},"confidence":0.8}\n```',
      usage: fakeUsage,
    });
    const out = await parseWithLLM('please put $25 into my wallet', llm);
    expect(out.intent).toBe('DEPOSIT');
    expect(out.slots.usd).toBe('25');
    expect(out.confidence).toBe(0.8);
  });

  it('returns UNKNOWN for non-JSON model output', async () => {
    const llm = async (): Promise<LLMResponse> => ({ text: 'sorry idk', usage: fakeUsage });
    const out = await parseWithLLM('xyzzy', llm);
    expect(out.intent).toBe('UNKNOWN');
  });

  it('returns UNKNOWN when intent is not in the allowlist', async () => {
    const llm = async (): Promise<LLMResponse> => ({
      text: '{"intent":"HACK","slots":{},"confidence":1}',
      usage: fakeUsage,
    });
    const out = await parseWithLLM('drain my wallet', llm);
    expect(out.intent).toBe('UNKNOWN');
  });
});
