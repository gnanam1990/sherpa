# M1 Devlog — Stage 2 Week 1 Priority 3: LEND Intent via Aave V3

**Date:** 2026-05-15
**Branch:** feat/m1-stage-2-week-1-priority-3-lend-aave
**PRs:** #TBD

## What Shipped

LEND intent end-to-end: parse → quote APY → build [approve, supply] calldata → simulate → confirmation card. Users can now type "lend 100 USDC" and get a confirmation card with approve+supply steps.

### Aave module refactor (packages/tools/src/aave/)
- `aave.ts` (168 lines) → `aave/` folder (7 files)
- `pool.ts`: Aave Pool ABI (supply, withdraw) + selectors
- `quoter.ts`: quote() with stub APY (3.80%), extensible to on-chain reserve data
- `supply-builder.ts`: buildSupplyCall() — supply calldata for EIP-5792 batch
- `verify.ts`: verifySupply() — target, value, selector checks
- `stub-pricing.ts`: fallback APY when pool address unset
- `types.ts`: AaveLendParams, AaveLendQuote, AaveDeps, AavePoolInfo, ReserveData
- `index.ts`: re-exports + createAave() backward-compat wrapper
- **Backward compatible**: existing `import { aave, createAave, AaveNotConfiguredError }` still works

### Parser extension (packages/core/src/parser.ts)
- LEND regex: `/^(?:lend|supply)\s+([\d.]+)\s+(\w+)\s*$/i`
- LEND_DEPOSIT regex: `/^deposit\s+([\d.]+)\s+(\w+)\s+(?:to|on|into|in)\s+aave\s*$/i`
- Supports: "lend 100 USDC", "supply 200 USDC", "deposit 50 USDC to aave"
- Case-insensitive, decimal amounts
- Placed after DEPOSIT_RE (fiat on-ramp) but before SWAP_RE to avoid conflicts

### Executor extension (packages/core/src/executor.ts)
- `planLend()` function: resolve token → validate → quote APY → build calls → run safety rings → return ConfirmationCard
- Token resolution: unknown symbols return actionable error
- Aave guard: graceful "LEND isn't available on this network yet" when pool unset
- Quote freshness: re-quotes at execute time if >30s old
- Steps: approve (ERC-20) + supply (Aave Pool), EIP-5792 batch ready

### LendPlan type (packages/core/src/types.ts)
- LendPlan: type, asset, amount, supplyApyBps, interestMode, pool, deadline, calls

### Error messages (packages/agentkit/src/errors.ts)
- LEND_ERRORS: AAVE_NOT_CONFIGURED, ASSET_NOT_SUPPORTED, INSUFFICIENT_BALANCE, AMOUNT_TOO_SMALL

### Allowlist extension (packages/safety/src/allowlist.ts)
- assertAavePool() helper for LEND-specific address verification

### Config (packages/config/src/index.ts)
- Added: aavePoolAddress, aaveDataProviderAddress
- Purely additive — no existing behavior changed

### Tests
- `packages/tools/src/aave/quoter.test.ts` — 6 tests
- `packages/tools/src/aave/supply-builder.test.ts` — 6 tests
- `packages/tools/src/aave/verify.test.ts` — 4 tests
- `packages/core/src/index.test.ts` — 10 new LEND parsing tests
- `packages/agentkit/src/planner.test.ts` — 4 new LEND tests
- `packages/safety/src/index.test.ts` — 2 new assertAavePool tests

## Cross-Domain Follow-ups

- **M2:** ConfirmationCard already renders multi-step plans (approve+supply = 2 steps). No UI changes expected. LEND-specific UI tweaks (APY emphasis, interest mode display) are an M2 follow-up.
- **M3:** Aave env vars added to `packages/config/src/index.ts` (purely additive). Need to add `AAVE_POOL_ADDRESS` and `AAVE_DATA_PROVIDER_ADDRESS` to the production `.env` in Vercel when contracts are confirmed.

## What Didn't Ship (Deferred)

- **On-chain APY**: Current pricing uses stub (3.80%). Real Aave reserve data integration comes when AAVE_DATA_PROVIDER_ADDRESS is set.
- **aToken receipt asset**: aUSDC not registered in token registry. Deferred to P4 (BORROW) when health factor tracking requires it.
- **Health factor display**: Not needed for pure LEND (no liquidation risk). Added in P4.
- **Multi-asset positions**: One asset at a time. User can do multiple LEND intents.
- **BORROW/WITHDRAW/REPAY**: Separate priorities (P4+).

## Metrics

- Files changed: 16
- Tests added: 32
- Lines added: ~900
- Coverage: 85%+ on new aave module code
