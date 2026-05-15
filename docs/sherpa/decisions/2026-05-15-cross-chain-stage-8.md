# Decision: Cross-Chain Orchestration (Stage 8 P4)

**Date:** 2026-05-15
**Status:** Accepted
**Stage:** 8 P4

## Context
Sherpa needs cross-chain orchestration to execute multi-step DeFi flows that span multiple L2s — e.g., bridge USDC from Base to Arbitrum, then swap for ETH on Camelot.

## Decisions

### Cross-chain Router (`packages/tools/src/cross-chain/router.ts`)
- `findBestRoute(source, dest, amount, deps)` — returns `CrossChainRoute` with protocol, fee, time, and amount bounds
- V1 stub uses Across protocol with 0.1% fee; real integration selects optimal bridge
- `estimateCrossChainTime(source, dest)` — 120s for L2-to-L2, 600s when L1 (Ethereum) is involved

### Cross-chain Orchestrator (`packages/tools/src/cross-chain/orchestrator.ts`)
- `orchestrate(steps: CrossChainStep[])` — aggregates steps into `OrchestratedTx` with total time and status
- `validateOrchestration(steps)` — rejects empty arrays (>0 errors) and arrays with >5 steps
- Status lifecycle: `pending → bridging → executing → completed | failed`

### Types (`packages/tools/src/cross-chain/types.ts`)
- `CrossChainRoute` — sourceChain, destinationChain, bridgeProtocol, estimatedTime, fee, minAmount, maxAmount
- `CrossChainStep` — chain, action, protocol, estimatedTime
- `OrchestratedTx` — steps[], totalTime, totalFee, status
- `CrossChainDeps` — chains[]

## Future Work
- Multi-bridge routing (compare Across, Hop, Stargate fees)
- Parallel step execution where chains are independent
- Retry logic for failed bridge confirmations
- Cross-chain transaction tracking via explorer APIs
