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
