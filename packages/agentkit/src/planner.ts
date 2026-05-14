import type { ParsedIntent, SimulationResult } from '@sherpa/core';
import type { PendingTx, SimulationCheckResult } from '@sherpa/safety';
import { createSimulator, type Simulator, type SimulatorCall, type TenderlyConfig } from '@sherpa/tools';

/**
 * Agentkit planner — simulation integration for the Sherpa agent loop.
 *
 * Provides:
 * - `shouldSimulate(intent)`: intent-gating logic (read-only intents skip)
 * - `createSimulationCallback(config, opts)`: wraps Tenderly simulator with
 *   fail-open/fail-closed policy into a callback suitable for ExecutorDeps
 */

// ── Intent gating ────────────────────────────────────────────────────────

/** Intents that are read-only and never need simulation. */
const READ_ONLY_INTENTS = new Set<string>(['BALANCE', 'HISTORY', 'IDENTITY_LOOKUP']);

/** Intents that are state-changing and always simulate. */
const STATE_CHANGING_INTENTS = new Set<string>([
  'SEND',
  'BUY',
  'BET',
  'SWAP',
  'LEND',
  'DEPOSIT',
  'BORROW',
  'STAKE',
  'BRIDGE',
  'LP',
]);

/**
 * Determine whether a parsed intent should go through Tenderly simulation.
 *
 * - Read-only intents (BALANCE, HISTORY): never simulate
 * - State-changing intents (SEND, BUY, SWAP, LEND, etc.): always simulate
 * - Unknown intents: skip simulation (fail-open for forward compatibility)
 */
export function shouldSimulate(intent: ParsedIntent): boolean {
  if (READ_ONLY_INTENTS.has(intent.intent)) return false;
  if (STATE_CHANGING_INTENTS.has(intent.intent)) return true;
  // Unknown intent — skip simulation rather than block
  return false;
}

// ── Simulation callback factory ──────────────────────────────────────────

export type SimulationCallbackOptions = {
  /** Whether to proceed when the simulation service is unavailable (default: true = Sepolia). */
  failOpen?: boolean;
  /** Optional override for the simulator (tests inject a mock). */
  simulator?: Simulator;
  /** Optional fetch override (forwarded to createSimulator). */
  fetchImpl?: typeof fetch;
  /** Optional logger for fail-open breadcrumbs. */
  log?: { warn: (msg: string, meta?: Record<string, unknown>) => void };
};

/**
 * Create a simulation callback suitable for `ExecutorDeps.simulate`.
 *
 * Wraps Tenderly simulation with intent-gating and fail-open/fail-closed
 * policy:
 * - SIMULATION_REVERT / INSUFFICIENT_FUNDS / INVALID_USEROP → always reject
 * - NETWORK_ERROR / TIMEOUT → reject on mainnet (fail-closed), warn on
 *   Sepolia (fail-open)
 */
export function createSimulationCallback(
  tenderlyConfig: TenderlyConfig,
  options?: SimulationCallbackOptions,
): (tx: PendingTx) => Promise<SimulationCheckResult> {
  const sim = options?.simulator ?? createSimulator(tenderlyConfig, {
    fetchImpl: options?.fetchImpl,
  });
  const failOpen = options?.failOpen ?? true;
  const log = options?.log;

  return async (tx: PendingTx): Promise<SimulationCheckResult> => {
    const call: SimulatorCall = {
      to: tx.to,
      data: tx.data,
      value: tx.value,
    };

    const result: SimulationResult = await sim.simulate([call], tx.to);

    if (result.ok) {
      return { ok: true, gasEstimate: result.gasEstimate };
    }

    // Service availability issues — apply fail-open/fail-closed policy
    if (result.errorCode === 'NETWORK_ERROR' || result.errorCode === 'TIMEOUT') {
      if (failOpen) {
        log?.warn('simulation_fail_open', {
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
        });
        // Return ok=true to let the transaction through (with no gas estimate)
        return { ok: true, gasEstimate: 0n };
      }
      // Fail-closed: reject
      return { ok: false, errorCode: result.errorCode, errorMessage: result.errorMessage };
    }

    // Transaction would actually fail — always reject regardless of fail-open
    return { ok: false, errorCode: result.errorCode, errorMessage: result.errorMessage };
  };
}
