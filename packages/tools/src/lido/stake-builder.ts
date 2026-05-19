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
import { assertAllowlisted, type Address } from '@sherpa/safety';
import { LidoNotConfiguredError } from './index.js';
import { STETH_ABI } from './steth.js';
import type { LidoDeps } from './types.js';
import { LIDO_STETH_ADDRESS } from './types.js';

export type StakeBuildResult = {
  to: Address;
  data: `0x${string}`;
  value: bigint;
  sponsorable: boolean;
};

export async function buildStakeCall(
  amount: bigint,
  deps: LidoDeps = {},
): Promise<StakeBuildResult> {
  const stethAddress = deps.stethAddress ?? (deps.chainId != null ? LIDO_STETH_ADDRESS[deps.chainId] : undefined);
  if (!stethAddress) {
    throw new LidoNotConfiguredError();
  }

  const extras: readonly Address[] = [stethAddress];

  const data = encodeFunctionData({
    abi: STETH_ABI,
    functionName: 'submit',
    args: ['0x0000000000000000000000000000000000000000'],
  });

  assertAllowlisted(stethAddress, extras);

  return {
    to: stethAddress,
    data,
    value: amount,
    sponsorable: true,
  };
}
