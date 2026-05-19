/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export type FlashLoanParams = {
  asset: string;
  amount: bigint;
  chainId: number;
};

export type LeverageParams = {
  asset: string;
  leverageRatio: number;
  collateralAsset: string;
  chainId: number;
};

export type ComposedStrategy = {
  id: string;
  name: string;
  steps: StrategyStep[];
  totalGas: bigint;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
};

export type StrategyStep = {
  intent: string;
  protocol: string;
  params: Record<string, string>;
  estimatedGas: bigint;
};

export type ComposableDeps = {
  chainId: number;
  aavePool?: `0x${string}`;
};
