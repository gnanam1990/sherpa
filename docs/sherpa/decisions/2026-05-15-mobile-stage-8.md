# Decision: Mobile & Cross-Chain UX (Stage 8 P3)

**Date:** 2026-05-15
**Status:** Accepted
**Stage:** 8 P3

## Context
Sherpa needs mobile-first UX considerations and cross-chain intent parsing to support bridging assets across L2s with post-bridge actions (e.g., bridge then swap).

## Decisions

### CROSS_CHAIN Intent
- Two regex patterns handle cross-chain parsing:
  - `CROSS_CHAIN_RE`: `bridge <amount> <asset> from <source> to <dest> and <action>` — for bridge-then-execute flows
  - `CROSS_CHAIN_SWAP_RE`: `swap <amount> <asset> at/for <chain> for <target>` — for single-chain cross swaps
- Slots: `crossAmount`, `crossAsset`, `crossSource`, `crossDest`, `crossAction`, `crossChain`, `crossTarget`
- Confidence: 0.9 for multi-step, 0.88 for single-step

### Mobile Considerations
- All confirmation cards render responsively; no mobile-specific parser changes needed
- Touch targets on buttons meet 44px minimum
- Transaction progress uses step indicators for multi-step cross-chain flows
- Estimated bridge times surfaced in the UI (120s L2-to-L2, 600s L1-involved)

### Cross-chain Router
- `findBestRoute(source, dest, amount, deps)` returns the best bridge route
- Stub selects Across protocol with 0.1% fee for V1
- `estimateCrossChainTime(source, dest)` returns time estimates based on chain types

### Cross-chain Orchestrator
- `orchestrate(steps)` builds a multi-step execution plan with total time aggregation
- `validateOrchestration(steps)` enforces min 1, max 5 steps

## Future Work
- Real bridge protocol integration (Across, Hop, Stargate)
- Chain-specific gas estimation for bridge transactions
- Mobile push notifications for bridge completion
- Optimistic bridge execution with rollback on failure
