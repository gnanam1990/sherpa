# Decision: Additional Chain Support — Polygon & Avalanche (Stage 6 P3)

**Date:** 2026-05-15
**Status:** Accepted
**Stage:** 6 P3

## Context
Stage 5 added Arbitrum and Optimism. Stage 6 P3 extends multi-chain support to Polygon and Avalanche, the two remaining high-liquidity EVM chains.

## Chains Added
- **Polygon (137)** — USDC, WMATIC, WETH, USDT
- **Avalanche (43114)** — USDC, WAVAX, WETH, USDT

## Design Decisions
- Same pattern as Stage 5: per-chain token arrays, symbol maps, chainId routing in `resolveToken` and `getTokensForChain`
- Native gas tokens wrapped as WMATIC / WAVAX (no native alias in registry — users specify the wrapped form)
- Chain constants: `POLYGON_CHAIN_ID = 137`, `AVALANCHE_CHAIN_ID = 43114`
- All addresses verified on Polygonscan / Snowtrace

## Token Addresses (verified)
| Token  | Polygon                                      | Avalanche                                    |
|--------|----------------------------------------------|----------------------------------------------|
| USDC   | `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` | `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` |
| WMATIC | `0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270` | —                                            |
| WAVAX  | —                                            | `0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7` |
| WETH   | `0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619` | `0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB` |
| USDT   | `0xc2132D05D31c914a87C6611C10748AEb04B58e8F` | `0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7` |

## Future Work
- Chain-specific protocol adapters (QuickSwap, Trader Joe, Aave V3 on Polygon)
- Avalanche C-bridge integration
- Gas token price feeds per chain
