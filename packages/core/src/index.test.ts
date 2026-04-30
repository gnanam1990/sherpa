import { describe, it, expect } from 'vitest';
import { parseDeterministic, plan } from './index.js';

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
});
