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

export type AaveLendAction = 'deposit' | 'withdraw';

export type AavePoolInfo = {
  poolAddress: Address;
  chainId: number;
};

export type ReserveData = {
  asset: TokenInfo;
  supplyApyBps: number;
  totalSupply: bigint;
  availableLiquidity: bigint;
};

export type AaveLendParams = {
  action: AaveLendAction;
  asset: 'USDC';
  amount: string;
  recipient: Address;
  referralCode?: number;
};

export type AaveLendQuote = {
  action: AaveLendAction;
  asset: 'USDC';
  amountBaseUnits: bigint;
  supplyApyBps: number;
  display: string;
};

export type AaveDeps = {
  poolAddress?: Address;
  dataProviderAddress?: Address;
  stubSupplyApyBps?: number;
  now?: () => number;
};

export type AaveBorrowParams = {
  asset: string;
  amount: bigint;
  interestMode: 'variable' | 'stable';
  collateralAsset?: string;
  targetHealthFactor?: number;
};

export type AaveBorrowQuote = {
  borrowApyBps: number;
  interestMode: 'variable' | 'stable';
  resultingHealthFactor: number;
  liquidationThresholdBps: number;
  availableBorrowsBase: bigint;
  pool: AavePoolInfo;
};

export type BorrowSimulation = {
  resultingHealthFactor: number;
  liquidationThresholdBps: number;
  availableBorrowsBase: bigint;
};

export const STUB_SUPPLY_APY_BPS = 380; // 3.80%
export const DEFAULT_DEADLINE_SECONDS = 600;
