import { describe, it, expect } from 'vitest';
import { verifySupply } from './verify.js';
import { buildSupplyCall } from './supply-builder.js';

const FAKE_POOL = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' as const;
const FAKE_USER = '0x1111111111111111111111111111111111111111' as const;
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;

describe('aave/verify', () => {
  it('accepts valid supply tx', async () => {
    const result = await buildSupplyCall(USDC_ADDRESS, 100_000_000n, FAKE_USER, 0, {
      poolAddress: FAKE_POOL,
    });
    const v = await verifySupply(
      { to: result.to, data: result.data, value: result.value, sponsorable: result.sponsorable },
      { poolAddress: FAKE_POOL },
    );
    expect(v.ok).toBe(true);
  });

  it('rejects wrong target', async () => {
    const result = await buildSupplyCall(USDC_ADDRESS, 100_000_000n, FAKE_USER, 0, {
      poolAddress: FAKE_POOL,
    });
    const v = await verifySupply(
      { ...result, to: FAKE_USER },
      { poolAddress: FAKE_POOL },
    );
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('target is not Aave V3 Pool');
  });

  it('rejects non-zero value', async () => {
    const result = await buildSupplyCall(USDC_ADDRESS, 100_000_000n, FAKE_USER, 0, {
      poolAddress: FAKE_POOL,
    });
    const v = await verifySupply(
      { ...result, value: 1n },
      { poolAddress: FAKE_POOL },
    );
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('LEND must have value=0');
  });

  it('rejects wrong selector', async () => {
    const result = await buildSupplyCall(USDC_ADDRESS, 100_000_000n, FAKE_USER, 0, {
      poolAddress: FAKE_POOL,
    });
    const v = await verifySupply(
      { ...result, data: '0xdeadbeef' },
      { poolAddress: FAKE_POOL },
    );
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('calldata is not Aave supply/withdraw');
  });

  it('rejects when pool address not configured', async () => {
    const v = await verifySupply(
      { to: FAKE_POOL, data: '0xdeadbeef', value: 0n, sponsorable: true },
      {},
    );
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('Aave V3 Pool address not configured');
  });
});
