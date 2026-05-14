# M1 Devlog — Stage 2 Week 1 Priority 1: Tenderly Simulation

**Date:** 2026-05-15
**Branch:** feat/m1-stage-2-week-1-priority-1-tenderly-simulation
**PRs:** #TBD

## What Shipped

Pre-flight transaction simulation via Tenderly API. Ring 6 (Simulation Gate) is now functional — every state-changing intent is simulated before the user sees a confirmation card.

### Core types (packages/core/src/types.ts)
- `SimulationResult` — union type: `{ ok: true, gasEstimate, traces?, simulatedAt }` | `{ ok: false, errorCode, errorMessage }`
- `SimulationErrorCode` — 5 codes: INSUFFICIENT_FUNDS_FOR_GAS, SIMULATION_REVERT, NETWORK_ERROR, TIMEOUT, INVALID_USEROP
- `SimulationTrace` — reserved for future call-trace enrichment

### Tenderly adapter (packages/tools/src/simulator/tenderly.ts)
- `createSimulator(config, options?)` — factory with DI fetch, DI now/setTimeout
- 5s timeout via AbortController
- 1 automatic retry on NETWORK_ERROR/TIMEOUT
- In-memory LRU cache: 30s TTL, max 1000 entries, case-insensitive sender keys
- Smart-mock-friendly: inject `fetchImpl` to assert request shape

### Simulation planner (packages/agentkit/src/planner.ts)
- `shouldSimulate(intent)` — intent gating by type (state-changing = yes, read-only = no)
- `createSimulationCallback(config, options?)` — wraps simulator with fail-open/fail-closed policy
- Fail-open ONLY for service availability (NETWORK_ERROR/TIMEOUT), NEVER for SIMULATION_REVERT

### Ring 6 upgrade (packages/safety/src/rings.ts)
- `simulate` callback now returns `SimulationCheckResult` instead of `boolean`
- Ring 6 rejects with structured error message from simulation result
- Backward compatible: `undefined` callback = no simulation (same as before)

### Error messages (packages/agentkit/src/errors.ts)
- `simulationErrorMessage(code)` — user-facing messages for all 5 error codes
- Messages are actionable ("Get some at faucet..." not just "Error")

### Config (packages/config/src/index.ts)
- Added: `tenderlyApiKey`, `tenderlyUser`, `tenderlyProject`, `simulationEnabled`, `isMainnet`
- `isMainnet` derived from `chain.name === 'base-mainnet'` — no new env var needed
- `simulationEnabled` defaults to `true`, can be disabled via `SHERPA_SIMULATION_ENABLED=false`
- **Purely additive — no existing behavior changed.** Pinging M3 for visibility.

### Tests
- `packages/tools/src/simulator/tenderly.test.ts` — 14 tests covering success, revert, insufficient funds, timeout, network error, retry, cache hit/miss/TTL, request shape validation
- `packages/agentkit/src/planner.test.ts` — 8 tests covering shouldSimulate for all intent types, fail-open/fail-closed behavior
- `packages/safety/src/index.test.ts` — added 5 Ring 6 tests (pass/fail/no-callback/async/structured error)

## Cross-Domain Follow-ups

- **M3:** Tenderly env vars added to `packages/config/src/index.ts` (purely additive). Need to add `TENDERLY_API_KEY`, `TENDERLY_USER`, `TENDERLY_PROJECT` to the production `.env` in Vercel. Get these from https://dashboard.tenderly.co.
- **M3:** `apps/api/.env.example` updated with the new vars.
- **M2:** No UI changes needed yet. The `ConfirmationCard` already receives `gas_display` — when simulation provides a gas estimate, it will be surfaced there in a future PR.

## What Didn't Ship (Deferred)

- Multi-call simulation (approve + swap in one Tenderly request) — current impl simulates the first call only. Full batch simulation comes when SWAP adapter is wired.
- Redis cache for simulation results — in-memory is sufficient for alpha. Redis comes at Stage 3.
- Foundry fallback simulation — deferred to Stage 2.5.

## Metrics

- Files changed: 12
- Tests added: 27
- Lines added: ~800
- Coverage: 85%+ on new simulator code
