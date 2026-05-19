/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { FeeCalculation } from './types.js';

export function calculateFee(
  amount: bigint,
  feeBps: number,
  treasury: `0x${string}`,
): FeeCalculation {
  const feeAmount = (amount * BigInt(feeBps)) / 10000n;
  return {
    inputAmount: amount,
    feeAmount,
    feeBps,
    treasury,
  };
}

export function buildFeeTransfer(
  token: `0x${string}`,
  _feeAmount: bigint,
  _treasury: `0x${string}`,
): { to: `0x${string}`; data: `0x${string}`; value: bigint } {
  return {
    to: token,
    data: '0x' as `0x${string}`,
    value: 0n,
  };
}
