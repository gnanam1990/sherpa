/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 * @sherpa/agentkit — Coinbase AgentKit fallback adapter + simulation planner (M1 ownership).
 */

export const AGENTKIT_FALLBACK_ENABLED = false as const;
export { shouldSimulate, createSimulationCallback, type SimulationCallbackOptions } from './planner.js';
export { simulationErrorMessage, formatSimulationError, SWAP_ERRORS, LEND_ERRORS, BORROW_ERRORS, MAINNET_ERRORS } from './errors.js';
