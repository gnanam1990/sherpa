# Decision: Portfolio Dashboard (Stage 6 P1)

**Date:** 2026-05-15
**Status:** Accepted
**Stage:** 6 P1

## Context
Sherpa needs a unified portfolio view across multiple chains, with P&L tracking and historical snapshots.

## Design Decisions

### Parser
- New `PORTFOLIO` intent with deterministic parsing
- Supports: `show my portfolio`, `check portfolio on <chain>`, `what's my pnl`, `show portfolio history`
- Regex patterns in `parser.ts:103-108`
- Slots: `portfolioAction` (show|pnl|history), `portfolioChain`

### Aggregator
- `aggregatePortfolio(snapshots)` — merges multi-chain snapshots into a single view
- Computes `totalValueUsd` and per-chain `chainBreakdown` with percentage allocation
- Handles empty portfolio gracefully (returns 0n)

### P&L Calculation
- `calculatePnl(currentValue, costBasis)` — returns `{ pnlUsd, pnlPercent }`
- Uses bigint arithmetic for precision (base units, 6 decimals for USDC)
- Handles zero cost basis (returns 0% to avoid division by zero)

### Data Model
- `PortfolioSnapshot`: timestamp, totalValueUsd, tokens[], positions[]
- `PortfolioToken`: symbol, address, decimals, chainId, balance, priceUsd, valueUsd
- `PortfolioPosition`: protocol, type (lend|borrow|lp|stake), tokens[], valueUsd, apy?

## Security
- Portfolio data is read-only — no transaction signing
- Chain-specific RPC calls go through existing infrastructure
- No new attack surface introduced

## Future Work
- Real-time price feeds (Pyth / Chainlink)
- Historical snapshots stored in Postgres
- Impermanent loss calculator for LP positions
- Portfolio alerts (value drops, position changes)
