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
import type { PoolBuildResult } from './supply-builder.js';

export const BORROW_SELECTOR = '0xa415bcad';

/**
 * Aave V3 on Base has stable-rate borrowing disabled — `interestRateMode === 1`
 * reverts at the pool. We reject it here, the lowest calldata-building
 * chokepoint, so no borrow/repay path can produce a stable-rate transaction.
 */
export class StableRateUnsupportedError extends Error {
  readonly code = 'STABLE_RATE_UNSUPPORTED';
  constructor() {
    super('Aave V3 on Base only supports variable-rate borrowing.');
    this.name = 'StableRateUnsupportedError';
  }
}

function assertVariableRate(interestRateMode: number): void {
  if (interestRateMode === 1) {
    throw new StableRateUnsupportedError();
  }
}

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
  assertVariableRate(params.interestRateMode);
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
  assertVariableRate(interestRateMode);
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
