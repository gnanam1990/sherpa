import { describe, it, expect } from 'vitest';
import { parseDeterministic, parseWithLLM, plan } from './index.js';
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
    const out = await plan(p, { userAddress: me, paymasterUrl: 'https://paymaster.test' });
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

  it('plans a BET with approve+bet steps', async () => {
    const p = parseDeterministic('bet $5 yes on eth-tops-5k');
    const out = await plan(p);
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.card.intent).toBe('BET');
      expect(out.card.steps.length).toBe(2);
      expect(out.card.steps[0]?.kind).toBe('approve');
      expect(out.card.steps[1]?.kind).toBe('bet');
    }
  });
});

describe('core/parseWithLLM', () => {
  const fakeUsage = { provider: 'gpt-4o-mini' as const, promptTokens: 1, completionTokens: 1, costUsd: 0 };

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
