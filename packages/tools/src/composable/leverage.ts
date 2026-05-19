/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export function calculateLeverage(
  collateral: bigint,
  ratio: number,
): { borrowAmount: bigint; newCollateral: bigint } {
  // Simple leverage calculation
  // ratio 2x = borrow 1x collateral value, swap to collateral, deposit
  const borrowAmount = collateral * BigInt(ratio - 1);
  return {
    borrowAmount,
    newCollateral: collateral + borrowAmount,
  };
}

export function calculateLiquidationPrice(
  collateral: bigint,
  debt: bigint,
  liquidationThreshold: number,
): bigint {
  if (debt === 0n) return 0n;
  return (debt * 10000n) / (collateral * BigInt(liquidationThreshold));
}

export function estimateLeverageRisk(ratio: number): 'low' | 'medium' | 'high' | 'extreme' {
  if (ratio <= 2) return 'low';
  if (ratio <= 3) return 'medium';
  if (ratio <= 5) return 'high';
  return 'extreme';
}
