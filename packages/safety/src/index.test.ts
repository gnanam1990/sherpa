import { describe, it, expect } from 'vitest';
import {
  ALLOWED_CONTRACTS,
  assertAllowlisted,
  assertAmountCap,
  buildSendCallsParams,
  checkRings,
  firstFailure,
  isBatchSponsorable,
  ringsOk,
  type Call,
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

describe('safety/sponsor', () => {
  const from = '0x1111111111111111111111111111111111111111' as const;
  const calls: Call[] = [
    { to: ALLOWED_CONTRACTS.USDC, data: '0xabcd', value: 0n },
    { to: ALLOWED_CONTRACTS.UNISWAP_ROUTER, data: '0x04e45aaf', value: 0n },
  ];

  it('builds an EIP-5792 envelope with hex chainId + values', () => {
    const env = buildSendCallsParams(calls, { chainId: 84532, from });
    expect(env.version).toBe('1.0');
    expect(env.chainId).toBe('0x14a34');
    expect(env.from).toBe(from);
    expect(env.calls.length).toBe(2);
    expect(env.calls[0]?.value).toBe('0x0');
    expect(env.capabilities).toBeUndefined();
  });

  it('includes paymasterService when url provided', () => {
    const env = buildSendCallsParams(calls, {
      chainId: 84532,
      from,
      paymasterUrl: 'https://paymaster.example/rpc',
    });
    expect(env.capabilities?.paymasterService?.url).toBe('https://paymaster.example/rpc');
  });

  it('throws on empty call list', () => {
    expect(() => buildSendCallsParams([], { chainId: 84532, from })).toThrow();
  });

  it('isBatchSponsorable: true when all values zero', () => {
    expect(isBatchSponsorable(calls)).toBe(true);
  });

  it('isBatchSponsorable: false when any call carries native value', () => {
    expect(
      isBatchSponsorable([...calls, { to: from, data: '0x', value: 1n }]),
    ).toBe(false);
  });
});
