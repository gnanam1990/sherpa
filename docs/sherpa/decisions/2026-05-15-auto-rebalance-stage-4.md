# Decision: AUTO_REBALANCE Intent — Stage 4 P5

**Date:** 2026-05-15
**Status:** Accepted
**Stage:** 4 (P5)

## Context

Users need the ability to rebalance their portfolio to maintain target asset allocations. Portfolio drift occurs naturally as asset prices change, causing allocations to deviate from user preferences.

## Decision

Add a new `AUTO_REBALANCE` intent to the Sherpa parser, types, executor, safety, and agentkit layers.

### Parser
- **Generic pattern**: `rebalance my portfolio`, `auto rebalance my holdings`
  - Confidence: 0.85
- **Target pattern**: `rebalance so that ETH is 60%`, `rebalance to USDC equals 50`
  - Confidence: 0.9
  - Captures `rebalanceTarget` and `rebalancePercent` slots

### Types
- New `AutoRebalancePlan` type with:
  - `currentAllocation` — existing portfolio breakdown
  - `targetAllocation` — desired allocations
  - `rebalanceActions` — swap actions needed
  - `threshold` — drift % that triggers rebalance
  - `calls` — on-chain transaction data

### Safety
- `validateRebalance()` enforces a maximum drift threshold (default 50%)
- Drift exceeding the cap requires manual review

### Error Messages
- `NO_PORTFOLIO` — no portfolio data available
- `DRIFT_TOO_LARGE` — drift exceeds safety cap
- `INSUFFICIENT_LIQUIDITY` — not enough liquidity to rebalance
- `REBALANCE_FAILED` — generic failure

## Consequences

- Parser handles common rebalance phrasings deterministically
- LLM fallback handles ambiguous phrasings
- Safety ring prevents excessive drift-based rebalancing
- Confirmation card displays rebalance summary with swap fee warnings
