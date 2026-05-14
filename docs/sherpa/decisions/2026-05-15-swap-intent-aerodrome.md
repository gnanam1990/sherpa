# Decision: SWAP Intent via Aerodrome (Stage 2 Priority 2)

**Date:** 2026-05-15
**Status:** Accepted
**Author:** M1 (Backend/Tools)
**PR:** feat/m1-stage-2-week-1-priority-2-swap-aerodrome

## Context

Stage 2's core intent is SWAP — users want to exchange tokens (e.g. "swap 100 USDC for ETH"). This is the first DeFi intent that touches an external protocol (Aerodrome DEX on Base). Unlike SEND (simple ERC-20 transfer), SWAP requires:

1. Token registry (which tokens exist, their decimals)
2. Price quoting (how much do I get back?)
3. Calldata construction (approve + swapExactTokensForTokens)
4. Slippage protection (min output amount)
5. Safety simulation (Ring 6 via Tenderly)

## Decision: Aerodrome as primary DEX

### Why Aerodrome over other Base DEXes

| DEX | TVL on Base | Sepolia support | Multi-hop | Stable pools |
|-----|-------------|-----------------|-----------|--------------|
| **Aerodrome** | $600M+ | Not deployed (gated) | Yes (via router) | Yes |
| Uniswap V3 | $200M+ | Yes (SwapRouter02) | Yes | Limited |
| Seamless | $50M+ | No | No | No |

**Winner: Aerodrome.** Highest TVL, native Base DEX, router handles routing. Uniswap is the fallback for tokens Aerodrome doesn't cover (future PR).

### Aerodrome Sepolia status

Aerodrome has no confirmed Sepolia deployment as of 2026-05. The code ships with `AERODROME_ROUTER_ADDRESS = undefined`, guarded by `AerodromeNotConfiguredError`. The planner returns a graceful error: "SWAP isn't available on this network yet."

**No code change needed when the address becomes available** — just set the env var or update the constant in `packages/safety/src/allowlist.ts`.

### Slippage defaults

- **Default:** 50 bps (0.5%) — standard for volatile pairs on Aerodrome
- **Minimum:** 10 bps (0.1%) — lower triggers validation error
- **Maximum:** No hard cap, but >500 bps (5%) surfaces a `RiskBadge("high_slippage")` warning
- **User override:** "swap 100 USDC for ETH with 1% slippage" parsed via regex suffix

### Price impact warning thresholds

- **< 100 bps (1%):** No warning
- **100–300 bps (1–3%):** Warning on ConfirmationCard
- **> 300 bps (3%):** Danger badge, require explicit confirmation

(Current stub pricing has 0% impact; real quoter integration adds this.)

### Token registry

Only confirmed Base Sepolia addresses. Never use placeholder addresses — they cause false reverts at execute time.

- USDC: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (6 decimals)
- ETH (native): `'native'` sentinel (18 decimals)
- WETH: `0x4200000000000000000000000000000000000006` (18 decimals)

To add a token: confirm address on basescan-sepolia.org.

### Multi-hop routing

Deferred to Stage 2.5. Single-hop covers the demo (USDC↔ETH). Aerodrome's router handles routing internally — we pass `tokenIn`, `tokenOut`, `amount` and the router finds the best path.

### Quote freshness

Quotes are computed at plan time. If the user takes >30s between seeing the ConfirmationCard and tapping Send, the executor should force re-quote. This is a planner-level concern, not a quoter concern.

## Architecture: aerodrome.ts → aerodrome/ folder refactor

The old `aerodrome.ts` (231 lines) is refactored into a modular folder:

```
packages/tools/src/aerodrome/
├── index.ts          // re-exports + createAerodrome backward-compat wrapper
├── quoter.ts         // quote() — Pyth/stub pricing, extensible to on-chain
├── swap-builder.ts   // buildSwapCall() — approve + swap calldata
├── verify.ts         // verifySwap() — tx shape validation
├── stub-pricing.ts   // Pyth-based fallback pricing
└── types.ts          // SwapParams, SwapQuote, AerodromeQuote, AerodromeRoute
```

**Backward compatible:** `import { aerodrome, createAerodrome } from '@sherpa/tools'` continues to work via index.ts re-exports.

## Files Changed

- `packages/tools/src/registry.ts` — new: token registry
- `packages/tools/src/aerodrome/` — new folder (refactored from aerodrome.ts)
- `packages/core/src/types.ts` — SwapPlan, SwapRoute types
- `packages/core/src/parser.ts` — SWAP regex with slippage suffix
- `packages/core/src/executor.ts` — planSwap function
- `packages/agentkit/src/errors.ts` — SWAP_ERRORS messages
- `packages/tools/src/index.ts` — updated re-exports
- Tests: 15 new tests (quoter: 7, swap-builder: 8, parser: 9, executor: 6)
