/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { encodeFunctionData } from 'viem';
import { AAVE_V3_POOL_ADDRESS, assertAllowlisted, type Address } from '@sherpa/safety';
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
