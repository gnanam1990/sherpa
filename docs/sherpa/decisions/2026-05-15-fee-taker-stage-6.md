# Decision: Fee Taker Module (Stage 6 P4)

**Date:** 2026-05-15
**Status:** Accepted
**Stage:** 6 P4

## Context
Sherpa needs a protocol fee mechanism to sustain infrastructure costs. The fee taker calculates and builds transfer calls for a configurable fee on swap/bridge operations.

## Design Decisions

### Fee Model
- **Basis points (bps)**: 100 bps = 1%. Default fee: 10 bps (0.1%)
- Fee = `(amount * feeBps) / 10000` — integer math, no floating point
- Treasury address is chain-specific, configured via `FeeConfig`

### Module Structure
- `calculator.ts` — pure functions: `calculateFee`, `buildFeeTransfer`
- `types.ts` — `FeeConfig`, `FeeCalculation`, `FeeTransfer`, `FeeDeps`
- No external dependencies — unit-testable in isolation

### `calculateFee(amount, feeBps, treasury)`
Returns `FeeCalculation` with `inputAmount`, `feeAmount`, `feeBps`, `treasury`.

### `buildFeeTransfer(token, feeAmount, treasury)`
Returns a stub transfer object (`to`, `data`, `value`). The `data` field is a placeholder — real ERC-20 transfer encoding happens at the execution layer.

## Test Coverage
- 0.1% fee (10 bps on 1e9 → 1e6)
- 0.5% fee (50 bps on 1e9 → 5e6)
- Zero fee (0 bps → 0)
- `buildFeeTransfer` shape validation

## Future Work
- Dynamic fee tiers based on volume
- Fee sharing with referrers
- On-chain fee verification via view function
