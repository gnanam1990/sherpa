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

export type UniswapSwapParams = {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  fee: number; // 500, 3000, 10000
  recipient: Address;
  deadline: bigint;
};

export type UniswapSwapQuote = {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  amountOut: bigint;
  fee: number;
  display: string;
};

export type UniswapV3Deps = {
  routerAddress?: Address;
  quoterAddress?: Address;
};
