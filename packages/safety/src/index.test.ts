import { describe, it, expect } from 'vitest';
import {
  ALLOWED_CONTRACTS,
  assertAllowlisted,
  assertAmountCap,
  checkRings,
  firstFailure,
  ringsOk,
  type PendingTx,
} from './index.js';

const goodTx: PendingTx = {
  to: ALLOWED_CONTRACTS.USDC,
  data: '0xa9059cbb00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
  value: 0n,
  asset: ALLOWED_CONTRACTS.USDC,
  amount: 1_000_000n,
  recipientSource: 'direct',
};

describe('safety/allowlist', () => {
  it('exports USDC on Base Sepolia', () => {
    expect(ALLOWED_CONTRACTS.USDC).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it('accepts an allowlisted address', () => {
    expect(() => assertAllowlisted(ALLOWED_CONTRACTS.USDC)).not.toThrow();
  });

  it('rejects an unknown address', () => {
    expect(() => assertAllowlisted('0x1111111111111111111111111111111111111111')).toThrow(
      /not in allowlist/,
    );
  });
});

describe('safety/caps', () => {
  it('accepts small USDC amounts', () => {
    expect(() => assertAmountCap(ALLOWED_CONTRACTS.USDC, 1_000_000n)).not.toThrow();
  });

  it('rejects amounts over per-tx cap', () => {
    expect(() => assertAmountCap(ALLOWED_CONTRACTS.USDC, 1_000_000_000n)).toThrow(
      /exceeds per-tx cap/,
    );
  });
});

describe('safety/rings', () => {
  it('all green for a clean tx', async () => {
    const results = await checkRings(goodTx);
    expect(ringsOk(results)).toBe(true);
    expect(firstFailure(results)).toBeUndefined();
  });

  it('fails ring1 for a non-allowlisted target', async () => {
    const results = await checkRings({
      ...goodTx,
      to: '0x1111111111111111111111111111111111111111',
    });
    expect(ringsOk(results)).toBe(false);
    expect(firstFailure(results)?.ring).toBe('ring1_allowlist');
  });

  it('fails ring2 for oversized amount', async () => {
    const results = await checkRings({ ...goodTx, amount: 9_999_999_999n });
    expect(firstFailure(results)?.ring).toBe('ring2_amount_cap');
  });

  it('fails ring6 when simulation rejects', async () => {
    const results = await checkRings(goodTx, { simulate: () => false });
    expect(firstFailure(results)?.ring).toBe('ring6_simulation');
  });
});
