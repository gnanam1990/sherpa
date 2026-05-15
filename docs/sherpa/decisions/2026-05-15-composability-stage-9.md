# ADR: DeFi Composability (Stage 9 P2)

**Date:** 2026-05-15
**Status:** Accepted
**Stage:** 9 — DeFi Composability

## Context

Sherpa needs composable DeFi primitives that allow users to chain operations (flash loans, leverage, multi-step strategies) into single intents. Users should be able to express complex DeFi operations like "flash loan 1000 USDC" or "leverage my ETH by 2x" as natural language.

## Decision

### Composable Module (`packages/tools/src/composable/`)

- **Flash Loans** (`flash-loan.ts`): `buildFlashLoanCall()` encodes Aave V3 flash loan calldata. `calculateFlashLoanFee()` computes the 0.09% fee.
- **Leverage** (`leverage.ts`): Three pure functions:
  - `calculateLeverage(collateral, ratio)` → borrow amount + new collateral.
  - `calculateLiquidationPrice(collateral, debt, threshold)` → liq price in base units.
  - `estimateLeverageRisk(ratio)` → `low | medium | high | extreme`.
- **Types** (`types.ts`): `FlashLoanParams`, `LeverageParams`, `ComposedStrategy`, `StrategyStep`, `ComposableDeps`.

### Parser Integration

Four new regex patterns in `parseDeterministic()`:

| Pattern | Intent | Slot |
|---------|--------|------|
| `flash loan <amt> <asset>` | COMPOSABLE | composableAction=flash_loan |
| `leverage my <asset> by <Nx>` | COMPOSABLE | composableAction=leverage |
| `deleverage my <asset>` | COMPOSABLE | composableAction=deleverage |
| `compose <step1> and <step2>` | COMPOSABLE | composableAction=compose |

`COMPOSABLE` added to `VALID_INTENTS` allowlist for LLM fallback.

### Executor

`planComposable()` in `executor.ts` dispatches by `composableAction`:
- `flash_loan` — builds Aave flash loan batch.
- `leverage` / `deleverage` — builds recursive borrow loop.
- `compose` — chains arbitrary strategy steps.

## Alternatives Considered

1. **Separate intents for each composable action** — rejected; `COMPOSABLE` with sub-action slots keeps the intent surface small.
2. **Runtime composition engine** — deferred; P2 uses static pattern matching. A dynamic DSL may come in Stage 10.

## Consequences

- +1 test file (`leverage.test.ts`), +4 parser tests, +2 doc files.
- Flash loan fee is hardcoded at 0.09% (Aave V3 default).
- Leverage calculations are pure math — no on-chain calls in the utility layer.
