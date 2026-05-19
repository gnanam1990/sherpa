/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export type HedgeStrategy = {
  name: string;
  description: string;
  estimatedCost: string;
  riskReduction: string;
};

export function suggestHedges(
  riskFactors: Array<{ type: string; severity: string }>,
): HedgeStrategy[] {
  const hedges: HedgeStrategy[] = [];

  for (const factor of riskFactors) {
    if (factor.type === 'concentration' && factor.severity !== 'low') {
      hedges.push({
        name: 'Diversify Holdings',
        description: 'Swap a portion of concentrated assets into stablecoins or other chains',
        estimatedCost: '0.1-0.3% swap fee',
        riskReduction: 'Medium',
      });
    }
    if (factor.type === 'leverage') {
      hedges.push({
        name: 'Reduce Leverage',
        description: 'Deleverage positions to reduce liquidation risk',
        estimatedCost: 'Gas + potential slippage',
        riskReduction: 'High',
      });
    }
  }

  return hedges;
}
