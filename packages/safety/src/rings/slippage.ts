import type {
  SlippageParams,
  SlippageResult,
  SlippageWarning,
} from '../types.js';

/** Minimum acceptable slippage (0.1%). */
export const MIN_SLIPPAGE_BPS = 10;

/** Maximum acceptable slippage (5%). */
export const MAX_SLIPPAGE_BPS = 500;

/** Price impact threshold for warnings (5%). */
export const WARN_PRICE_IMPACT_BPS = 500;

/** Price impact threshold for hard block (15%). */
export const BLOCK_PRICE_IMPACT_BPS = 1500;

/** Default slippage tolerance when user doesn't specify. */
export const DEFAULT_SLIPPAGE_BPS = 100;

function classifyWarning(priceImpactBps: number, slippageBps: number): SlippageWarning | undefined {
  if (priceImpactBps >= BLOCK_PRICE_IMPACT_BPS) {
    return {
      level: 'dangerous',
      message: `Price impact of ${(priceImpactBps / 100).toFixed(1)}% is extremely high. You will lose a significant portion of value.`,
    };
  }
  if (priceImpactBps >= WARN_PRICE_IMPACT_BPS) {
    return {
      level: 'risky',
      message: `Price impact of ${(priceImpactBps / 100).toFixed(1)}% is high. Consider a smaller trade size.`,
    };
  }
  if (slippageBps > MAX_SLIPPAGE_BPS) {
    return {
      level: 'risky',
      message: `Slippage tolerance of ${(slippageBps / 100).toFixed(1)}% exceeds the recommended maximum of ${(MAX_SLIPPAGE_BPS / 100).toFixed(1)}%.`,
    };
  }
  if (priceImpactBps > 100) {
    return {
      level: 'caution',
      message: `Price impact of ${(priceImpactBps / 100).toFixed(1)}% detected.`,
    };
  }
  return undefined;
}

/**
 * Check slippage and price impact safety for swap intents.
 *
 * Returns a result object — never throws for user-level errors.
 * Throws only for infrastructure failures (invalid bps values indicating bugs).
 */
export function checkSlippage(params: SlippageParams): SlippageResult {
  const { priceImpactBps } = params;
  const slippageBps = params.slippageBps ?? DEFAULT_SLIPPAGE_BPS;

  if (priceImpactBps < 0) {
    throw new Error('[safety] priceImpactBps must be non-negative');
  }
  if (slippageBps < 0) {
    throw new Error('[safety] slippageBps must be non-negative');
  }

  const warning = classifyWarning(priceImpactBps, slippageBps);

  // Hard block: price impact exceeds absolute ceiling
  if (priceImpactBps >= BLOCK_PRICE_IMPACT_BPS) {
    return {
      pass: false,
      priceImpactBps,
      slippageBps,
      blockReason: `Price impact of ${(priceImpactBps / 100).toFixed(1)}% exceeds the maximum allowed ${(BLOCK_PRICE_IMPACT_BPS / 100).toFixed(1)}%. This swap would result in massive value loss.`,
      warning,
    };
  }

  // Block: slippage tolerance exceeds absolute max
  if (slippageBps > MAX_SLIPPAGE_BPS) {
    return {
      pass: false,
      priceImpactBps,
      slippageBps,
      blockReason: `Slippage tolerance of ${(slippageBps / 100).toFixed(1)}% exceeds the maximum ${(MAX_SLIPPAGE_BPS / 100).toFixed(1)}%.`,
      warning,
    };
  }

  return {
    pass: true,
    priceImpactBps,
    slippageBps,
    warning,
  };
}
