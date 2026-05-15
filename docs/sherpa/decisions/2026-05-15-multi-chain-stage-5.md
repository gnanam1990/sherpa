# Decision: Multi-chain Support (Stage 5 P1)

**Date:** 2026-05-15
**Status:** Accepted
**Stage:** 5 P1

## Context
Sherpa needs multi-chain support to expand beyond Base.

## Supported Chains
- Base (primary) — Aerodrome, Aave
- Arbitrum — Camelot, Aave, Uniswap V3
- Optimism — Velodrome, Aave, Uniswap V3

## Design Decisions
- Chain detection from wallet connection
- Protocol addresses resolved by chainId
- Cross-chain bridging via Across protocol
- Chain-specific safety allowlists

## Token Registries
- Each chain has its own token set
- USDC, ETH, WETH on all chains
- Chain-specific tokens (ARB, OP)

## Future Work
- Polygon, Avalanche support
- Chain-specific gas estimation
- Cross-chain intent orchestration
