import { describe, expect, it, vi } from 'vitest';
import {
  AAVE_POOL_BASE,
  MAX_HEALTH_FACTOR,
  classifyHealthFactor,
  getUserAaveAccountData,
  isMaxHealthFactor,
} from './positions.js';

const USER = '0x1111111111111111111111111111111111111111' as const;
const NOW = new Date('2026-05-16T00:00:00.000Z');

function readContractReturning(result: readonly [bigint, bigint, bigint, bigint, bigint, bigint]) {
  return vi.fn(async () => result);
}

describe('aave/positions', () => {
  it('queries the Base Aave V3 Pool with getUserAccountData', async () => {
    const readContract = readContractReturning([0n, 0n, 0n, 0n, 0n, MAX_HEALTH_FACTOR]);
    await getUserAaveAccountData(USER, { readContract, now: () => NOW });

    expect(readContract).toHaveBeenCalledWith({
      address: AAVE_POOL_BASE,
      abi: expect.any(Array),
      functionName: 'getUserAccountData',
      args: [USER],
    });
  });

  it('serializes an empty position with no supplies or borrows', async () => {
    const position = await getUserAaveAccountData(USER, {
      readContract: readContractReturning([0n, 0n, 0n, 0n, 0n, MAX_HEALTH_FACTOR]),
      now: () => NOW,
    });

    expect(position).toMatchObject({
      totalCollateralBase: 0n,
      totalDebtBase: 0n,
      availableBorrowsBase: 0n,
      currentLiquidationThreshold: 0n,
      ltv: 0n,
      healthFactor: MAX_HEALTH_FACTOR,
      hasPosition: false,
      fetchedAt: NOW,
    });
  });

  it('marks supply-only accounts as positions with max health factor', async () => {
    const position = await getUserAaveAccountData(USER, {
      readContract: readContractReturning([
        1_000_000_000n,
        0n,
        750_000_000n,
        8_250n,
        7_800n,
        MAX_HEALTH_FACTOR,
      ]),
    });

    expect(position.hasPosition).toBe(true);
    expect(isMaxHealthFactor(position.healthFactor)).toBe(true);
  });

  it('marks debt-only accounts as positions', async () => {
    const position = await getUserAaveAccountData(USER, {
      readContract: readContractReturning([0n, 250_000_000n, 0n, 0n, 0n, 900_000_000_000_000_000n]),
    });

    expect(position.hasPosition).toBe(true);
    expect(position.totalDebtBase).toBe(250_000_000n);
  });

  it('returns mixed supply and borrow data without converting bigint precision', async () => {
    const position = await getUserAaveAccountData(USER, {
      readContract: readContractReturning([
        12_345_678_901_234_567_890n,
        9_876_543_210_987_654_321n,
        123_456_789n,
        8_250n,
        7_800n,
        1_432_100_000_000_000_000n,
      ]),
    });

    expect(position.totalCollateralBase).toBe(12_345_678_901_234_567_890n);
    expect(position.totalDebtBase).toBe(9_876_543_210_987_654_321n);
    expect(position.currentLiquidationThreshold).toBe(8_250n);
    expect(position.ltv).toBe(7_800n);
    expect(position.healthFactor).toBe(1_432_100_000_000_000_000n);
  });

  it('accepts a string RPC URL for production callers', async () => {
    const readContract = readContractReturning([0n, 0n, 0n, 0n, 0n, MAX_HEALTH_FACTOR]);
    const position = await getUserAaveAccountData(USER, { readContract, rpcUrl: 'https://example.invalid' });
    expect(position.hasPosition).toBe(false);
  });

  it('throws RPC errors instead of silently returning fake data', async () => {
    const readContract = vi.fn(async () => {
      throw new Error('rpc unavailable');
    });

    await expect(getUserAaveAccountData(USER, { readContract })).rejects.toThrow('rpc unavailable');
  });

  it('classifies max health factor as no debt', () => {
    expect(classifyHealthFactor(MAX_HEALTH_FACTOR)).toBe('no-debt');
  });

  it('classifies HF >= 2.0 as safe', () => {
    expect(classifyHealthFactor(2_000_000_000_000_000_000n)).toBe('safe');
    expect(classifyHealthFactor(3_100_000_000_000_000_000n)).toBe('safe');
  });

  it('classifies 1.5 <= HF < 2.0 as caution', () => {
    expect(classifyHealthFactor(1_500_000_000_000_000_000n)).toBe('caution');
    expect(classifyHealthFactor(1_999_999_999_999_999_999n)).toBe('caution');
  });

  it('classifies 1.2 <= HF < 1.5 as risky', () => {
    expect(classifyHealthFactor(1_200_000_000_000_000_000n)).toBe('risky');
    expect(classifyHealthFactor(1_499_999_999_999_999_999n)).toBe('risky');
  });

  it('classifies HF < 1.2 as danger', () => {
    expect(classifyHealthFactor(1_199_999_999_999_999_999n)).toBe('danger');
    expect(classifyHealthFactor(0n)).toBe('danger');
  });

  it('detects only exact max uint health factor as max', () => {
    expect(isMaxHealthFactor(MAX_HEALTH_FACTOR)).toBe(true);
    expect(isMaxHealthFactor(MAX_HEALTH_FACTOR - 1n)).toBe(false);
  });

  it('uses the supplied clock for deterministic fetchedAt tests', async () => {
    const position = await getUserAaveAccountData(USER, {
      readContract: readContractReturning([1n, 0n, 0n, 0n, 0n, MAX_HEALTH_FACTOR]),
      now: () => NOW,
    });

    expect(position.fetchedAt).toBe(NOW);
  });

  it('treats available borrow data as Base USD with 8-decimal bigint precision', async () => {
    const position = await getUserAaveAccountData(USER, {
      readContract: readContractReturning([500_000_000n, 100_000_000n, 250_000_000n, 8_000n, 7_500n, 4_000_000_000_000_000_000n]),
    });

    expect(position.availableBorrowsBase).toBe(250_000_000n);
  });
});
