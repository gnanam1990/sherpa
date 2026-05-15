import { encodeFunctionData } from 'viem';
import { AAVE_V3_POOL_ADDRESS, assertAllowlisted, type Address } from '@sherpa/safety';
import { AaveNotConfiguredError } from './quoter.js';
import { AAVE_POOL_ABI } from './pool.js';
import type { AaveDeps } from './types.js';
import type { PoolBuildResult } from './supply-builder.js';

export const BORROW_SELECTOR = '0xa415bcad';

export type BorrowParams = {
  asset: Address;
  amount: bigint;
  interestRateMode: 1 | 2;
  onBehalfOf: Address;
  referralCode?: number;
};

export async function buildBorrowCall(
  params: BorrowParams,
  deps: AaveDeps = {},
): Promise<PoolBuildResult> {
  const poolAddress = deps.poolAddress ?? AAVE_V3_POOL_ADDRESS;
  if (!poolAddress) {
    throw new AaveNotConfiguredError();
  }

  const extras: readonly Address[] = [poolAddress];

  const data = encodeFunctionData({
    abi: AAVE_POOL_ABI,
    functionName: 'borrow',
    args: [params.asset, params.amount, BigInt(params.interestRateMode), params.referralCode ?? 0, params.onBehalfOf],
  });

  assertAllowlisted(poolAddress, extras);

  return {
    to: poolAddress,
    data,
    value: 0n,
    sponsorable: true,
  };
}

export async function buildRepayCall(
  asset: Address,
  amount: bigint,
  interestRateMode: 1 | 2,
  onBehalfOf: Address,
  deps: AaveDeps = {},
): Promise<PoolBuildResult> {
  const poolAddress = deps.poolAddress ?? AAVE_V3_POOL_ADDRESS;
  if (!poolAddress) {
    throw new AaveNotConfiguredError();
  }

  const extras: readonly Address[] = [poolAddress];

  const data = encodeFunctionData({
    abi: AAVE_POOL_ABI,
    functionName: 'repay',
    args: [asset, amount, BigInt(interestRateMode), onBehalfOf],
  });

  assertAllowlisted(poolAddress, extras);

  return {
    to: poolAddress,
    data,
    value: 0n,
    sponsorable: true,
  };
}
