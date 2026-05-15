# Decision: ANALYTICS Intent (Stage 7 P2)

**Date:** 2026-05-15
**Status:** Accepted
**Stage:** 7 P2

## Context
Sherpa needs an ANALYTICS intent for users to query their on-chain activity metrics — trading volume, fees paid, transaction stats, and usage patterns.

## Decisions

### Supported Actions
- **volume**: Total trading volume and daily average
- **fees**: Total fees paid (protocol + gas breakdown)
- **stats**: Summary statistics (success rate, most used intent)
- **usage**: Transaction count and activity metrics

### Parser Patterns
- `show my total volume` → `analyticsAction: 'volume'`
- `what's my fees paid` → `analyticsAction: 'fees'`
- `show my stats` → `analyticsAction: 'stats'`
- `display my usage` → `analyticsAction: 'usage'`

### Aggregator Module
- `getVolumeMetrics(query)` — returns `VolumeMetrics` (totalVolume, dailyAverage, peakDay)
- `getFeeMetrics(query)` — returns `FeeMetrics` (totalFeesPaid, protocolFees, gasFees, averageFeePerTx)
- `getUsageMetrics(query)` — returns `UsageMetrics` (totalTransactions, successRate, uniqueIntents, mostUsedIntent, activeDays)
- All functions accept `AnalyticsQuery` with `userAddress` and `period`
- Stub implementations for V1; will integrate with indexer/subgraph later

### Data Model
- `VolumeMetrics`: totalVolume, totalVolumeUsd, dailyAverage, peakDay
- `FeeMetrics`: totalFeesPaid, protocolFees, gasFees, averageFeePerTx
- `UsageMetrics`: totalTransactions, successRate, uniqueIntents, mostUsedIntent, activeDays

## Future Work
- Real data integration via subgraph or indexer
- Per-chain filtering via `chainId` in `AnalyticsQuery`
- Historical trend data with time-series support
- Export/analytics sharing capabilities
