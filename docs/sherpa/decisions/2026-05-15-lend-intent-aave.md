# Decision: LEND Intent via Aave V3 (Stage 2 Priority 3)

**Date:** 2026-05-15
**Status:** Accepted
**Author:** M1 (Backend/Tools)
**PR:** feat/m1-stage-2-week-1-priority-3-lend-aave

## Context

Stage 2's LEND intent lets users earn yield on their USDC by supplying it to a lending protocol. Users type natural-language commands like "lend 100 USDC", "deposit 50 USDC to aave", or "supply 200 USDC". The agent parses the intent, quotes current APY, builds an [approve, supply] batch via EIP-5792, simulates with Tenderly, and presents a confirmation card.

The lending protocol landscape on Base includes:
- **Aave V3**: Most-used lending protocol globally, $10B+ TVL across chains, well-audited, Base deployment exists
- **Morpho Blue**: $2B+ TVL on Base, optimized rates, but more complex market structure
- **Seamless Protocol**: $50M+ TVL, Base-native, but smaller liquidity

## Decision: Aave V3 as primary LEND target

### Why Aave V3 over alternatives

| Protocol | TVL on Base | Sepolia support | Complexity | Audit status |
|----------|-------------|-----------------|------------|--------------|
| **Aave V3** | $1B+ | Pending (gated) | Low (single Pool proxy) | Multiple audits, battle-tested |
| Morpho Blue | $2B+ | Unconfirmed | Medium (MarketParams tuple) | Audited |
| Seamless | $50M+ | No | Low | Single audit |

**Winner: Aave V3.** Largest global TVL, simplest integration surface (single Pool.supply call), well-audited. Morpho is the fallback for rate optimization (future PR).

### Aave V3 Sepolia status

Aave V3 has testnet deployments on multiple chains. The Base Sepolia Pool proxy address changes occasionally. The code ships with `AAVE_V3_POOL_ADDRESS = undefined`, guarded by `AaveNotConfiguredError`. The planner returns a graceful error: "LEND isn't available on this network yet."

**No code change needed when the address becomes available** — just set the env var `AAVE_POOL_ADDRESS` in the environment.

### Supply flow: approve + supply

Aave V3 supply requires two calls:
1. **ERC-20 approve**: User approves USDC spending for the Aave Pool contract
2. **Pool.supply**: Supply USDC to the Aave Pool on behalf of the user

These are batched via EIP-5792 `wallet_sendCalls` for Smart Wallet users.

### Variable APY only

Aave V3 supports variable and stable interest rates for borrows. For supplies, the rate is always variable (you earn whatever the current utilization rate produces). Stage 2 P3 ships variable APY only — no stable rate option.

### Receipt asset (aToken) handling

When a user supplies USDC to Aave, they receive aUSDC (an aToken) representing their position. This aToken:
- Accrues interest automatically (balance increases over time)
- Is NOT registered in the token registry for P3 (per Q1 decision)
- Will be added with `isReceiptToken: true` flag in P4 when health factor tracking requires it

### Stage-2-prep pattern

Same as Aerodrome and Limitless: ship the code, guard via `AaveNotConfiguredError`, flip the env var when contracts are ready. This pattern:
- Lets us merge and test the full flow without waiting for contract deployment
- Provides a clear error message to users when the feature isn't available yet
- Requires zero code changes when the address becomes available

### Quote freshness

Quotes are computed at plan time. If the user takes >30s between seeing the ConfirmationCard and tapping Proceed, the executor forces a re-quote at execute time. This prevents stale APY from being displayed.

### Minimum amount

No minimum enforced at the safety layer. The planner returns a warning if the amount is very small (<$0.10 USD-equivalent), surfacing as a yellow RiskBadge on the ConfirmationCard. User can still proceed.

## Architecture: aave.ts → aave/ folder

The old `aave.ts` (168 lines) is refactored into a modular folder matching the aerodrome/ pattern:

```
packages/tools/src/aave/
├── index.ts          // re-exports + createAave backward-compat wrapper
├── pool.ts           // Aave Pool ABI + selectors
├── quoter.ts         // quote() — stub pricing, extensible to on-chain
├── supply-builder.ts // buildSupplyCall() — supply calldata
├── verify.ts         // verifySupply() — tx shape validation
├── stub-pricing.ts   // fallback APY when pool address unset
└── types.ts          // AaveLendParams, AaveLendQuote, AaveDeps, etc.
```

**Backward compatible:** `import { aave, createAave, AaveNotConfiguredError } from '@sherpa/tools'` continues to work via index.ts re-exports.

## Future: BORROW, WITHDRAW, REPAY

Stage 2 P3 ships LEND (supply) only. Follow-up priorities:
- **P4 (BORROW):** Borrow against collateral, health factor tracking, aToken registration
- **WITHDRAW:** Remove supplied assets from Aave
- **REPAY:** Repay borrowed amounts

The modular aave/ folder structure supports all of these — each gets its own builder file (borrow-builder.ts, withdraw-builder.ts, etc.).

## Files Changed

- `packages/tools/src/aave/` — new folder (refactored from aave.ts)
- `packages/tools/src/aave/types.ts` — AaveLendParams, AaveLendQuote, AaveDeps, AavePoolInfo, ReserveData
- `packages/tools/src/aave/pool.ts` — Aave Pool ABI + selectors
- `packages/tools/src/aave/quoter.ts` — quote() with stub pricing
- `packages/tools/src/aave/supply-builder.ts` — buildSupplyCall() calldata
- `packages/tools/src/aave/verify.ts` — verifySupply()
- `packages/tools/src/aave/stub-pricing.ts` — fallback APY
- `packages/tools/src/aave/index.ts` — re-exports + createAave factory
- `packages/tools/src/index.ts` — updated re-exports
- `packages/core/src/types.ts` — LendPlan type
- `packages/core/src/parser.ts` — LEND regex patterns
- `packages/core/src/executor.ts` — planLend function
- `packages/agentkit/src/errors.ts` — LEND_ERRORS
- `packages/safety/src/allowlist.ts` — assertAavePool helper
- `packages/config/src/index.ts` — Aave env vars (additive)
- `apps/api/.env.example` — documented new env vars
- Tests: 30+ new tests
