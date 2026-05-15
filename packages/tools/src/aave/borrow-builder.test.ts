import { describe, it, expect } from 'vitest';
import { buildBorrowCall, buildRepayCall, BORROW_SELECTOR } from './borrow-builder.js';
import { AaveNotConfiguredError } from './quoter.js';

const FAKE_POOL = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' as const;
const FAKE_USER = '0x1111111111111111111111111111111111111111' as const;
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;

describe('aave/borrow-builder', () => {
  it('produces a call with correct selector', async () => {
    const result = await buildBorrowCall(
      {
        asset: USDC_ADDRESS,
        amount: 100_000_000n,
        interestRateMode: 2,
        onBehalfOf: FAKE_USER,
      },
      { poolAddress: FAKE_POOL },
    );
    expect(result.data.startsWith(BORROW_SELECTOR)).toBe(true);
    expect(result.value).toBe(0n);
    expect(result.to).toBe(FAKE_POOL);
    expect(result.sponsorable).toBe(true);
  });

  it('handles stable rate mode', async () => {
    const result = await buildBorrowCall(
      {
        asset: USDC_ADDRESS,
        amount: 50_000_000n,
        interestRateMode: 1,
        onBehalfOf: FAKE_USER,
      },
      { poolAddress: FAKE_POOL },
    );
    expect(result.data.startsWith(BORROW_SELECTOR)).toBe(true);
  });

  it('handles zero amount', async () => {
    const result = await buildBorrowCall(
      {
        asset: USDC_ADDRESS,
        amount: 0n,
        interestRateMode: 2,
        onBehalfOf: FAKE_USER,
      },
      { poolAddress: FAKE_POOL },
    );
    expect(result.data).toBeDefined();
  });

  it('throws AaveNotConfiguredError when pool unset', async () => {
    await expect(
      buildBorrowCall({
        asset: USDC_ADDRESS,
        amount: 100_000_000n,
        interestRateMode: 2,
        onBehalfOf: FAKE_USER,
      }),
    ).rejects.toBeInstanceOf(AaveNotConfiguredError);
  });
});

describe('aave/repay-builder', () => {
  it('produces a call with repay data', async () => {
    const result = await buildRepayCall(USDC_ADDRESS, 100_000_000n, 2, FAKE_USER, {
      poolAddress: FAKE_POOL,
    });
    expect(result.data).toBeDefined();
    expect(result.value).toBe(0n);
    expect(result.to).toBe(FAKE_POOL);
    expect(result.sponsorable).toBe(true);
  });

  it('throws AaveNotConfiguredError when pool unset', async () => {
    await expect(
      buildRepayCall(USDC_ADDRESS, 100_000_000n, 2, FAKE_USER),
    ).rejects.toBeInstanceOf(AaveNotConfiguredError);
  });
});
