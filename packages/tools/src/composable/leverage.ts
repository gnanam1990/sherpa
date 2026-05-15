import type { LeverageParams, ComposableDeps } from './types.js';

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
