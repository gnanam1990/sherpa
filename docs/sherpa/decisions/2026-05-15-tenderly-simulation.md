# Decision: Tenderly Transaction Simulation

**Date:** 2026-05-15
**Status:** Accepted
**Author:** M1 (Backend/Tools)
**PR:** feat/m1-stage-2-week-1-priority-1-tenderly-simulation

## Context

Stage 2 introduces DeFi intents (SWAP, LEND, BORROW, STAKE, BRIDGE, LP) that interact with external smart contracts. Unlike Stage 1's SEND (simple ERC-20 transfer), DeFi transactions can fail for protocol-specific reasons: insufficient liquidity, health factor violations, expired approvals, slippage, etc.

Without simulation, users waste gas on failed transactions and get cryptic on-chain revert messages. The PRD mandates pre-flight simulation via Ring 6 before the confirmation card is shown.

## Decision: Use Tenderly Simulation API

### Why Tenderly vs alternatives

| Provider | Pros | Cons |
|----------|------|------|
| **Tenderly** | Full trace, gas estimate, revert reason, free tier (1000/mo), Base Sepolia support | External dependency, 500ms-2s latency |
| Alchemy simulateAssetChanges | Integrated with Alchemy RPC | Requires Alchemy paid plan, less detailed traces |
| eth_call | Zero latency, no API key | No revert reason (returns `0x`), can't estimate gas for complex multi-step, doesn't catch all failure modes |
| Foundry `cast call` | Local, no API key | Requires Foundry installed, slow for batch, no CI integration |

**Winner: Tenderly.** Best developer experience, free tier covers alpha testing, detailed revert reasons we can surface to users.

### Cost Model

Tenderly free tier: 1000 simulations/month. At our alpha scale (~100 users, ~10 tx/user/month), this covers us with headroom. If we exceed:
- Tenderly Growth plan: $50/month for 10,000 sims
- Mitigation: 30s in-memory LRU cache prevents redundant simulations (same sender + same calldata)

### Failure Mode Design

The critical insight: **service availability failures ≠ transaction failures.**

```
SIMULATION_REVERT / INSUFFICIENT_FUNDS / INVALID_USEROP
  → Transaction would actually fail on-chain
  → ALWAYS reject (regardless of network)

NETWORK_ERROR / TIMEOUT
  → Service is down, can't determine tx validity
  → Sepolia (fail-open): warn + proceed (dev needs to iterate)
  → Mainnet (fail-closed): reject (real money at stake)
```

This is implemented in `createSimulationCallback` in `packages/agentkit/src/planner.ts`.

### Why Ring 6 specifically

Ring 6 runs after Rings 1-5 (allowlist, amount cap, rate limit, recipient, audit log). This ordering is deliberate:

1. **Rings 1-5 are cheap** (< 1ms each) — reject obvious bad inputs before spending API quota
2. **Ring 6 is expensive** (~500ms, burns Tenderly quota) — only runs on inputs that passed all cheap checks
3. **Ring 6 is before executor** — catches simulation failures before the user sees a confirmation card

If Ring 6 ran before Ring 2 (amount cap), we'd waste Tenderly quota simulating transactions that would be rejected anyway for exceeding caps.

### Intent gating

Simulation runs for all state-changing intents, not by dollar value:

- **Always simulate:** SEND, BUY, BET, SWAP, LEND, DEPOSIT, BORROW, STAKE, BRIDGE, LP
- **Never simulate:** BALANCE, HISTORY, IDENTITY_LOOKUP (read-only, nothing to simulate)
- **Unknown:** skip simulation (fail-open for forward compatibility)

The PRD's "$100 threshold" was Stage 1 thinking. Stage 2 DeFi intents are always worth simulating — Tenderly latency (~500ms) is acceptable for any state-changing operation.

## Future Considerations

- **Stage 2.5:** May add Foundry-based local simulation as fallback when Tenderly is down
- **Stage 3:** Simulation results could be cached in Redis for DCA flows
- **Mainnet flip:** `config.isMainnet` is derived from `chain.name === 'base-mainnet'` — no new env var needed

## Files Changed

- `packages/core/src/types.ts` — SimulationResult, SimulationErrorCode, SimulationTrace types
- `packages/tools/src/simulator/tenderly.ts` — Tenderly adapter with DI, cache, retry
- `packages/tools/src/simulator/tenderly.test.ts` — 14 tests, 85%+ coverage
- `packages/agentkit/src/planner.ts` — shouldSimulate + createSimulationCallback
- `packages/agentkit/src/errors.ts` — human-readable error messages
- `packages/safety/src/rings.ts` — Ring 6 uses SimulationCheckResult
- `packages/safety/src/types.ts` — SimulationCheckResult type
- `packages/config/src/index.ts` — Tenderly env vars (purely additive)
- `apps/api/.env.example` — documented new env vars
