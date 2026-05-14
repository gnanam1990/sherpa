import type { SimulationErrorCode } from '@sherpa/core';

/**
 * Human-readable error messages for simulation error codes.
 *
 * Displayed on the confirmation card when simulation rejects a transaction.
 * Keep messages actionable — tell the user what to do, not just what happened.
 */
const ERROR_MESSAGES: Record<SimulationErrorCode, string> = {
  INSUFFICIENT_FUNDS_FOR_GAS:
    'Not enough Sepolia ETH for gas. Get some at faucet.quicknode.com/base-sepolia',
  SIMULATION_REVERT:
    'This transaction would fail. Try a smaller amount or different recipient.',
  TIMEOUT: 'Simulation took too long. Try again.',
  NETWORK_ERROR:
    "Couldn't reach simulation service. Proceeding without pre-check on Sepolia.",
  INVALID_USEROP: 'Transaction malformed. Please refresh and try again.',
};

/**
 * Map a SimulationErrorCode to a user-facing message.
 */
export function simulationErrorMessage(code: SimulationErrorCode): string {
  return ERROR_MESSAGES[code] ?? 'Unknown simulation error. Try again.';
}

/**
 * Map a full SimulationResult (failed) to a user-facing message.
 * Returns undefined if the result is ok (no error to display).
 */
export function formatSimulationError(result: {
  ok: boolean;
  errorCode?: SimulationErrorCode;
}): string | undefined {
  if (result.ok || !result.errorCode) return undefined;
  return simulationErrorMessage(result.errorCode);
}

// ── SWAP-specific error messages ───────────────────────────────────────

export const SWAP_ERRORS = {
  TOKEN_NOT_FOUND: (symbol: string) =>
    `Sherpa doesn't know about ${symbol} yet. Try USDC, ETH, or WETH.`,
  PRICE_IMPACT_HIGH: (impactPct: string) =>
    `This swap has high price impact (${impactPct}%). Reduce amount or try a different pair.`,
  POOL_NOT_FOUND: (from: string, to: string) =>
    `Aerodrome doesn't have a pool for ${from}/${to} on this network.`,
  NETWORK_NOT_SUPPORTED: () =>
    "SWAP isn't available on this network yet.",
  SLIPPAGE_TOO_LOW: () =>
    'Slippage must be at least 0.1%.',
  SLIPPAGE_HIGH: (pct: string) =>
    `High slippage tolerance (${pct}%). Price may move significantly.`,
} as const;

// ── LEND-specific error messages ───────────────────────────────────

export const LEND_ERRORS = {
  AAVE_NOT_CONFIGURED: () =>
    "LEND isn't available on this network yet. Try a different intent.",
  ASSET_NOT_SUPPORTED: (symbol: string) =>
    `Aave doesn't support ${symbol} on this network. Try USDC.`,
  INSUFFICIENT_BALANCE: (symbol: string) =>
    `You don't have enough ${symbol} to lend.`,
  AMOUNT_TOO_SMALL: () =>
    'Lend amount is very small. Minimum recommended is $0.10.',
} as const;
