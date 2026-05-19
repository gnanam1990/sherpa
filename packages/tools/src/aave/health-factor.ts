/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export type UserAccountData = {
  totalCollateralBase: bigint;
  totalDebtBase: bigint;
  availableBorrowsBase: bigint;
  currentLiquidationThreshold: number;
  ltv: number;
  healthFactor: bigint;
};

export function computeHealthFactor(
  totalCollateralEth: bigint,
  totalDebtEth: bigint,
  liquidationThresholdBps: number,
): number {
  if (totalDebtEth === 0n) return Infinity;
  const threshold = BigInt(liquidationThresholdBps);
  const hf = (totalCollateralEth * threshold * 1000000000000000000n) / (totalDebtEth * 10000n);
  return Number(hf) / 1e18;
}

export function computePostBorrowHealthFactor(
  currentData: UserAccountData,
  borrowAmountUsd: bigint,
): number {
  const newTotalDebt = currentData.totalDebtBase + borrowAmountUsd;
  return computeHealthFactor(currentData.totalCollateralBase, newTotalDebt, currentData.currentLiquidationThreshold);
}

export function healthFactorToBps(hf: number): number {
  return Math.round(hf * 10000);
}

export function healthFactorRiskLevel(hf: number): 'safe' | 'warning' | 'danger' {
  if (hf < 1.1) return 'danger';
  if (hf < 1.5) return 'warning';
  return 'safe';
}
