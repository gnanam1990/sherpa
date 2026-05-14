/**
 * @sherpa/agentkit — Coinbase AgentKit fallback adapter + simulation planner (M1 ownership).
 */

export const AGENTKIT_FALLBACK_ENABLED = false as const;
export { shouldSimulate, createSimulationCallback, type SimulationCallbackOptions } from './planner.js';
export { simulationErrorMessage, formatSimulationError, SWAP_ERRORS } from './errors.js';
