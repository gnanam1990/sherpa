import { describe, expect, it, vi } from 'vitest';
import { toFunctionSelector } from 'viem';
import {
  SHERPA_ROUTER_BASE_MAINNET,
  buildSherpaRouterBorrowPlan,
  buildSherpaRouterRepayPlan,
  buildSherpaRouterSupplyPlan,
  buildSherpaRouterSwapPlan,
  buildSherpaRouterWithdrawPlan,
  type SherpaRouterReadContract,
} from './sherpa-router.js';

const AERODROME_ROUTER = '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43' as const;
const AAVE_POOL = '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5' as const;
const A_TOKEN = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
const VARIABLE_DEBT = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as const;

function reserveData() {
  return [
    0n,
    0n,
    0n,
    0n,
    0n,
    0n,
    0,
    0,
    A_TOKEN,
    '0xcccccccccccccccccccccccccccccccccccccccc',
    VARIABLE_DEBT,
    '0xdddddddddddddddddddddddddddddddddddddddd',
    0n,
    0n,
    0n,
  ] as const;
}

const deps = (readContract?: SherpaRouterReadContract) => ({
  aerodromeRouterAddress: AERODROME_ROUTER,
  aavePoolAddress: AAVE_POOL,
  now: () => 1_700_000_000,
  readContract,
});

describe('SherpaRouter mainnet call builders', () => {
  it('builds approve + Router.swap with a live Aerodrome quote', async () => {
    const readContract = vi.fn(async () => [1_000_000n, 2_000_000_000_000_000n]);
    const plan = await buildSherpaRouterSwapPlan({
      fromAsset: 'USDC',
      toAsset: 'ETH',
      amount: '1',
      deps: deps(readContract),
    });

    expect(readContract).toHaveBeenCalledWith(expect.objectContaining({ functionName: 'getAmountsOut' }));
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0]?.to).toBe('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
    expect(plan.steps[1]?.to).toBe(SHERPA_ROUTER_BASE_MAINNET);
    expect(plan.steps[1]?.data.slice(0, 10)).toBe(
      toFunctionSelector('swap(address,address,uint256,uint256,(address,address,bool,address)[],uint256)'),
    );
    expect(plan.amountBaseUnits).toBe(1_000_000n);
    expect(plan.minOut).toBe(1_990_000_000_000_000n);
  });

  it('throws instead of using a fake swap quote', async () => {
    const readContract = vi.fn(async () => [1_000_000n, 0n]);
    await expect(
      buildSherpaRouterSwapPlan({
        fromAsset: 'USDC',
        toAsset: 'ETH',
        amount: '1',
        deps: deps(readContract),
      }),
    ).rejects.toThrow(/no output quote/i);
  });

  it('builds approve + Router.supply', async () => {
    const plan = await buildSherpaRouterSupplyPlan({ asset: 'USDC', amount: '2', deps: deps() });
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0]?.to).toBe('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
    expect(plan.steps[1]?.to).toBe(SHERPA_ROUTER_BASE_MAINNET);
    expect(plan.steps[1]?.data.slice(0, 10)).toBe(toFunctionSelector('supply(address,uint256)'));
  });

  it('builds aToken approval + Router.withdraw', async () => {
    const readContract = vi.fn(async () => reserveData());
    const plan = await buildSherpaRouterWithdrawPlan({
      asset: 'WETH',
      amount: '0.001',
      deps: deps(readContract),
    });
    expect(readContract).toHaveBeenCalledWith(expect.objectContaining({ functionName: 'getReserveData' }));
    expect(plan.steps[0]?.to).toBe(A_TOKEN);
    expect(plan.steps[1]?.data.slice(0, 10)).toBe(toFunctionSelector('withdraw(address,uint256)'));
  });

  it('builds variable debt delegation + Router.borrow', async () => {
    const readContract = vi.fn(async () => reserveData());
    const plan = await buildSherpaRouterBorrowPlan({
      asset: 'USDC',
      amount: '1',
      deps: deps(readContract),
    });
    expect(plan.steps[0]?.to).toBe(VARIABLE_DEBT);
    expect(plan.steps[0]?.data.slice(0, 10)).toBe(toFunctionSelector('approveDelegation(address,uint256)'));
    expect(plan.steps[1]?.data.slice(0, 10)).toBe(toFunctionSelector('borrow(address,uint256,uint256)'));
  });

  it('builds approve + Router.repay', async () => {
    const plan = await buildSherpaRouterRepayPlan({ asset: 'USDC', amount: '1', deps: deps() });
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0]?.to).toBe('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
    expect(plan.steps[1]?.data.slice(0, 10)).toBe(toFunctionSelector('repay(address,uint256,uint256)'));
  });
});
