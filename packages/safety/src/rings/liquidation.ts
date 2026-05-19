/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type {
  LiquidationParams,
  LiquidationResult,
  LiquidationWarning,
} from '../types.js';

/** Buffer percentage below which a warning is emitted (20%). */
export const WARN_BUFFER_PERCENT = 20;

/**
 * Calculate the liquidation price for a collateralized borrow position.
 *
 * This ring is **informational only** — it never blocks, only warns.
 * The caller uses the result to populate risk indicators on the
 * confirmation card.
 */
export function calculateLiquidationPrice(params: LiquidationParams): LiquidationResult {
  const { currentPriceUSD, collateralAmount, borrowAmountUSD, liquidationThreshold } = params;

  if (currentPriceUSD <= 0) {
    throw new Error('[safety] currentPriceUSD must be positive');
  }
  if (collateralAmount <= 0n) {
    throw new Error('[safety] collateralAmount must be positive');
  }
  if (borrowAmountUSD < 0) {
    throw new Error('[safety] borrowAmountUSD must be non-negative');
  }
  if (liquidationThreshold <= 0 || liquidationThreshold > 1) {
    throw new Error('[safety] liquidationThreshold must be in (0, 1]');
  }

  // Liquidation price = borrowAmountUSD / (collateralAmount * liquidationThreshold)
  // In USD terms: the price at which collateral value * threshold = borrow amount
  const collateralUnits = Number(collateralAmount) / 1e18;
  const liquidationPriceUSD = collateralUnits > 0
    ? borrowAmountUSD / (collateralUnits * liquidationThreshold)
    : 0;

  const bufferPercent = currentPriceUSD > 0
    ? ((currentPriceUSD - liquidationPriceUSD) / currentPriceUSD) * 100
    : 0;

  let warning: LiquidationWarning | undefined;
  if (bufferPercent < 0) {
    warning = {
      level: 'dangerous',
      message: `Position is below the liquidation price. Immediate action required.`,
    };
  } else if (bufferPercent < WARN_BUFFER_PERCENT) {
    if (bufferPercent < 5) {
      warning = {
        level: 'dangerous',
        message: `Liquidation buffer is only ${bufferPercent.toFixed(1)}%. Very high risk of liquidation.`,
      };
    } else if (bufferPercent < 10) {
      warning = {
        level: 'risky',
        message: `Liquidation buffer is ${bufferPercent.toFixed(1)}%. Consider adding collateral.`,
      };
    } else {
      warning = {
        level: 'caution',
        message: `Liquidation buffer is ${bufferPercent.toFixed(1)}%. Below the recommended ${WARN_BUFFER_PERCENT}% safety margin.`,
      };
    }
  }

  return {
    liquidationPriceUSD,
    currentPriceUSD,
    bufferPercent,
    warning,
  };
}
