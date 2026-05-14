import { describe, it, expect } from 'vitest';
import { buildSupplyCall } from './supply-builder.js';
import { SUPPLY_SELECTOR } from './pool.js';
import { AaveNotConfiguredError } from './quoter.js';

const FAKE_POOL = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' as const;
const FAKE_USER = '0x1111111111111111111111111111111111111111' as const;
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;

describe('aave/supply-builder', () => {
  it('returns correct calldata shape', async () => {
    const result = await buildSupplyCall(USDC_ADDRESS, 100_000_000n, FAKE_USER, 0, {
      poolAddress: FAKE_POOL,
    });
    expect(result.to).toBe(FAKE_POOL);
    expect(result.data.startsWith(SUPPLY_SELECTOR)).toBe(true);
    expect(result.value).toBe(0n);
    expect(result.sponsorable).toBe(true);
  });

  it('targets Aave Pool address', async () => {
    const result = await buildSupplyCall(USDC_ADDRESS, 100_000_000n, FAKE_USER, 0, {
      poolAddress: FAKE_POOL,
    });
    expect(result.to).toBe(FAKE_POOL);
  });

  it('has zero value (ERC-20 supply)', async () => {
    const result = await buildSupplyCall(USDC_ADDRESS, 100_000_000n, FAKE_USER, 0, {
      poolAddress: FAKE_POOL,
    });
    expect(result.value).toBe(0n);
  });

  it('throws AaveNotConfiguredError when pool unset', async () => {
    await expect(
      buildSupplyCall(USDC_ADDRESS, 100_000_000n, FAKE_USER),
    ).rejects.toBeInstanceOf(AaveNotConfiguredError);
  });

  it('selector matches supply function', async () => {
    const result = await buildSupplyCall(USDC_ADDRESS, 100_000_000n, FAKE_USER, 0, {
      poolAddress: FAKE_POOL,
    });
    expect(result.data.startsWith(SUPPLY_SELECTOR)).toBe(true);
  });

  it('uses default referralCode of 0', async () => {
    const result = await buildSupplyCall(USDC_ADDRESS, 100_000_000n, FAKE_USER, undefined, {
      poolAddress: FAKE_POOL,
    });
    expect(result.data.startsWith(SUPPLY_SELECTOR)).toBe(true);
  });
});
