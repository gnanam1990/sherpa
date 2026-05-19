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
  HealthFactorParams,
  HealthFactorResult,
  HealthFactorWarning,
} from '../types.js';

/** Hard block floor for borrow intents (1.2e18 = 1.2 in 18-decimal fixed-point). */
export const MIN_HF_BORROW = 1200000000000000000n;

/** Stricter floor for withdraw intents (1.5e18). */
export const MIN_HF_WITHDRAW = 1500000000000000000n;

/** Threshold below which a warning is emitted (1.5e18). */
export const WARN_HF_THRESHOLD = 1500000000000000000n;

function classifyWarning(postHF: bigint): HealthFactorWarning | undefined {
  if (postHF >= WARN_HF_THRESHOLD) return undefined;

  if (postHF < MIN_HF_BORROW) {
    return {
      level: 'dangerous',
      message: `Post-action health factor ${formatHF(postHF)} is critically low. High liquidation risk.`,
    };
  }
  if (postHF < 1400000000000000000n) {
    return {
      level: 'risky',
      message: `Post-action health factor ${formatHF(postHF)} is in the risky zone. Consider adding collateral.`,
    };
  }
  return {
    level: 'caution',
    message: `Post-action health factor ${formatHF(postHF)} is approaching the danger zone.`,
  };
}

function formatHF(hf: bigint): string {
  return (Number(hf) / 1e18).toFixed(2);
}

/**
 * Check health factor safety for borrow and withdraw intents.
 *
 * Returns a result object — never throws for user-level errors.
 * Throws only for infrastructure failures (e.g. malformed data that
 * indicates a bug upstream).
 */
export function checkHealthFactor(params: HealthFactorParams): HealthFactorResult {
  const { intent, currentHF, postHF } = params;

  if (currentHF < 0n) {
    throw new Error('[safety] currentHF must be non-negative');
  }
  if (postHF < 0n) {
    throw new Error('[safety] postHF must be non-negative');
  }

  const warning = classifyWarning(postHF);

  if (intent === 'borrow') {
    if (postHF < MIN_HF_BORROW) {
      return {
        pass: false,
        currentHF,
        postHF,
        blockReason: `Post-borrow health factor ${formatHF(postHF)} is below the minimum ${formatHF(MIN_HF_BORROW)}. This borrow would put the position at extreme liquidation risk.`,
        warning: warning ?? { level: 'dangerous', message: 'Health factor critically low.' },
        severity: 'critical',
      };
    }
    if (postHF < WARN_HF_THRESHOLD) {
      return {
        pass: true,
        currentHF,
        postHF,
        warning,
        severity: 'warning',
      };
    }
    return { pass: true, currentHF, postHF, severity: 'info' };
  }

  // Withdraw intent — stricter threshold
  if (postHF < MIN_HF_WITHDRAW) {
    return {
      pass: false,
      currentHF,
      postHF,
      blockReason: `Post-withdraw health factor ${formatHF(postHF)} is below the minimum ${formatHF(MIN_HF_WITHDRAW)}. This withdrawal would trigger liquidation.`,
      warning: warning ?? { level: 'dangerous', message: 'Health factor critically low.' },
      severity: 'critical',
    };
  }
  if (postHF < WARN_HF_THRESHOLD) {
    return {
      pass: true,
      currentHF,
      postHF,
      warning,
      severity: 'warning',
    };
  }
  return { pass: true, currentHF, postHF, severity: 'info' };
}
