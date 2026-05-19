/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { Address } from '@sherpa/safety';

export type LPParams = {
  tokenA: Address;
  tokenB: Address;
  amountA: bigint;
  amountB: bigint;
  stable: boolean;
  minAmountA: bigint;
  minAmountB: bigint;
  to: Address;
  deadline: bigint;
};

export function buildAddLiquidityCall(params: LPParams): {
  to: Address;
  data: `0x${string}`;
  value: bigint;
} {
  void params;
  return {
    to: '0x0000000000000000000000000000000000000000' as Address,
    data: '0x' as `0x${string}`,
    value: 0n,
  };
}
