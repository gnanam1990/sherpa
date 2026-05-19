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
import type { TokenInfo } from '../registry.js';

export type CamelotAsset = 'USDC' | 'WETH' | 'ARB' | 'USDT' | 'WBTC';

export type CamelotParams = {
  amountIn: string;
  fromAsset: CamelotAsset;
  toAsset: CamelotAsset;
  recipient: Address;
  slippageBps?: number;
  deadline?: number;
};

export type CamelotQuote = {
  fromAsset: CamelotAsset;
  toAsset: CamelotAsset;
  amountInBaseUnits: bigint;
  amountOutBaseUnits: bigint;
  display: string;
  route: string;
  fromToken: TokenInfo;
  toToken: TokenInfo;
  priceImpactBps: number;
  slippageBps: number;
  minOutAmount: bigint;
  deadline: number;
};

export type CamelotDeps = {
  routerAddress?: Address;
  quoterAddress?: Address;
  chainId?: number;
  slippageBps?: number;
  now?: () => number;
};

export const CAMELOT_CHAIN_ID = 42161;
export const DEFAULT_SLIPPAGE_BPS = 50;
export const DEFAULT_DEADLINE_SECONDS = 600;
