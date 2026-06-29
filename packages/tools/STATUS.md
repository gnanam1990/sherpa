# Tool adapter status

`@sherpa/tools` ships many protocol adapters, but only a subset is wired into the
mainnet execution path. This file mirrors, at the code level, the honesty of the
README's "What's Coming" section so the breadth of `src/` is never mistaken for
breadth of production support.

**Production execution path:** natural-language intents are planned and executed
only through the audited `SherpaRouter` against **Aave V3** (lending) and
**Aerodrome** (swaps) on Base. Verified by what `@sherpa/core`'s executor imports
— `aave`, `aerodrome`, and the `buildSherpaRouter*Plan` builders, nothing else.

## Legend

- **live** — wired into the production execution/plan path and exercised by the
  executor/SDK.
- **scaffolded** — real adapter code exists but is NOT wired into execution;
  gated behind review, audit, or upstream availability.
- **planned** — minimal placeholder; not functional yet.

## Protocol adapters

| Adapter | Status | Notes |
| --- | --- | --- |
| `aave` | live | Aave V3 supply / withdraw / borrow / repay on Base (variable-rate only). |
| `aerodrome` | live | Aerodrome swaps on Base. |
| `sherpa-router` | live | Calldata builders for the audited SherpaRouter the live flows route through. |
| `morpho` (`morpho.ts`) | scaffolded | Morpho Blue — scaffolded for Stage 2 prep, not wired (README "What's Coming"). |
| `across` | scaffolded | Bridging — disabled until adapters/routes are reviewed/audited (README). |
| `layerzero` | scaffolded | Bridging — disabled until reviewed/audited (README). |
| `cross-chain` | scaffolded | Cross-chain orchestration — review-gated; non-Base support is read-only. |
| `bridge-aggregator` (`bridge-aggregator.ts`) | scaffolded | Bridge route aggregation — disabled until reviewed (README). |
| `camelot` | scaffolded | Alt DEX router (non-Base); not on the Base execution path. |
| `quickswap` | scaffolded | Alt DEX router (non-Base); not wired. |
| `velodrome` | scaffolded | Alt DEX router (non-Base); not wired. |
| `uniswap-v3` / `uniswap` (`uniswap.ts`) | planned | Minimal placeholder; not functional. |
| `lido` | scaffolded | Liquid staking; not wired. |
| `limitless` | scaffolded | Prediction markets; not wired. |
| `polyforge` | scaffolded | Prediction markets; not wired. |
| `governance` | scaffolded | On-chain governance; not wired. |
| `session-keys` | scaffolded | Waiting on broader Coinbase Smart Wallet GA before exposure (README). |
| `ai-agent` | scaffolded | Agent flows; not wired. |
| `automation` | scaffolded | Automation flows; not wired. |
| `composable` | scaffolded | Composable multi-step intents; not wired. |
| `strategies` | scaffolded | Strategy bundles; not wired. |
| `analytics` | scaffolded | Analytics surface; not wired. |
| `notifications` | scaffolded | Notification surface; not wired. |
| `security` | scaffolded | Security/multisig settings; not wired. |
| `farcaster` | scaffolded | Social surface; not wired. |
| `social` | scaffolded | Social surface; not wired. |
| `zora` | scaffolded | NFT/mint surface; not wired. |
| `onramp` (`onramp.ts`) | scaffolded | Fiat on-ramp; not wired. |

## Supporting modules (infrastructure, not protocol adapters)

These back the live path or provide read-only data:

- **live:** `compliance` (OFAC screening, ring-0 — see the compliance ADR),
  `oracles` / `pyth.ts` (price feeds), `fee-taker` (builder-code fee), `risk`,
  `portfolio`, `balance.ts`, `history.ts`, `basescan.ts`, `registry.ts`,
  `parser`, `usdc.ts`, `viem.ts`.

Keep this file in sync when an adapter is promoted from scaffolded → live.
