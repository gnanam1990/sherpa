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
  IntentType,
  HealthFactorParams,
  HealthFactorResult,
  SlippageParams,
  SlippageResult,
  LiquidationParams,
  LiquidationResult,
} from './types.js';
import type { PendingTx, RingCheckResult } from './types.js';
import { checkRings, type RingsDependencies } from './rings.js';
import { checkHealthFactor } from './rings/health-factor.js';
import { checkSlippage } from './rings/slippage.js';
import { calculateLiquidationPrice } from './rings/liquidation.js';

export type PipelineResult = {
  ringResults: RingCheckResult[];
  healthFactor?: HealthFactorResult;
  slippage?: SlippageResult;
  liquidation?: LiquidationResult;
  /** True only when all checks pass. */
  pass: boolean;
};

export type PipelineDeps = RingsDependencies & {
  healthFactor?: HealthFactorParams;
  slippage?: SlippageParams;
  liquidation?: LiquidationParams;
};

/**
 * Run the full safety pipeline for a given intent type.
 *
 * - SwapIntent:   rings 1-7 + slippage
 * - BorrowIntent: rings 1-7 + health-factor + liquidation
 * - WithdrawIntent: rings 1-7 + health-factor
 * - SendIntent:   rings 1-7 only (unchanged)
 */
export async function runPipeline(
  tx: PendingTx,
  intent: IntentType,
  deps: PipelineDeps = {},
): Promise<PipelineResult> {
  const ringResults = await checkRings(tx, deps);
  const ringsPass = ringResults.every((r) => r.ok);

  let healthFactor: HealthFactorResult | undefined;
  let slippage: SlippageResult | undefined;
  let liquidation: LiquidationResult | undefined;

  switch (intent) {
    case 'SwapIntent':
      if (deps.slippage) {
        slippage = checkSlippage(deps.slippage);
      }
      break;

    case 'BorrowIntent':
      if (deps.healthFactor) {
        healthFactor = checkHealthFactor(deps.healthFactor);
      }
      if (deps.liquidation) {
        liquidation = calculateLiquidationPrice(deps.liquidation);
      }
      break;

    case 'WithdrawIntent':
      if (deps.healthFactor) {
        healthFactor = checkHealthFactor(deps.healthFactor);
      }
      break;

    case 'SendIntent':
      // No additional rings — rings 1-7 only
      break;
  }

  const hfPass = healthFactor ? healthFactor.pass : true;
  const slippagePass = slippage ? slippage.pass : true;

  return {
    ringResults,
    healthFactor,
    slippage,
    liquidation,
    pass: ringsPass && hfPass && slippagePass,
  };
}
