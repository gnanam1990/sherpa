import { encodeFunctionData } from 'viem';
import { ALLOWED_CONTRACTS, AAVE_V3_POOL_ADDRESS, assertAllowlisted, type Address } from '@sherpa/safety';
import { AaveNotConfiguredError } from './quoter.js';
import { AAVE_POOL_ABI } from './pool.js';
import type { AaveDeps } from './types.js';

export type PoolBuildResult = {
  to: Address;
  data: `0x${string}`;
  value: bigint;
  sponsorable: boolean;
};

export async function buildSupplyCall(
  asset: Address,
  amount: bigint,
  recipient: Address,
  referralCode: number = 0,
  deps: AaveDeps = {},
): Promise<PoolBuildResult> {
  const poolAddress = deps.poolAddress ?? AAVE_V3_POOL_ADDRESS;
  if (!poolAddress) {
    throw new AaveNotConfiguredError();
  }

  const extras: readonly Address[] = [poolAddress];

  const data = encodeFunctionData({
    abi: AAVE_POOL_ABI,
    functionName: 'supply',
    args: [asset, amount, recipient, referralCode],
  });

  assertAllowlisted(poolAddress, extras);

  return {
    to: poolAddress,
    data,
    value: 0n,
    sponsorable: true,
  };
}

export async function buildWithdrawCall(
  asset: Address,
  amount: bigint,
  recipient: Address,
  deps: AaveDeps = {},
): Promise<PoolBuildResult> {
  const poolAddress = deps.poolAddress ?? AAVE_V3_POOL_ADDRESS;
  if (!poolAddress) {
    throw new AaveNotConfiguredError();
  }

  const extras: readonly Address[] = [poolAddress];

  const data = encodeFunctionData({
    abi: AAVE_POOL_ABI,
    functionName: 'withdraw',
    args: [asset, amount, recipient],
  });

  assertAllowlisted(poolAddress, extras);

  return {
    to: poolAddress,
    data,
    value: 0n,
    sponsorable: true,
  };
}
