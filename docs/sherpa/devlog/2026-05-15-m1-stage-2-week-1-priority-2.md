# M1 Devlog — Stage 2 Week 1 Priority 2: SWAP Intent via Aerodrome

**Date:** 2026-05-15
**Branch:** feat/m1-stage-2-week-1-priority-2-swap-aerodrome
**PRs:** #TBD

## What Shipped

SWAP intent end-to-end: parse → quote → build calldata → simulate → confirmation card. Users can now type "swap 100 USDC for ETH" and get a confirmation card with approve+swap steps.

### Token registry (packages/tools/src/registry.ts)
- `TokenInfo` type: symbol, address, decimals, chainId
- Base Sepolia: USDC, ETH (native), WETH
- `resolveToken(symbol)` — case-insensitive lookup
- `allTokens()` — enumerate registered tokens
- No placeholder addresses — tokens must be confirmed on basescan-sepolia.org

### Aerodrome refactor (packages/tools/src/aerodrome/)
- `aerodrome.ts` (231 lines) → `aerodrome/` folder (6 files)
- `quoter.ts`: quote() with Pyth/stub pricing, extensible to on-chain quoter
- `swap-builder.ts`: buildSwapCall() — approve + swapExactTokensForTokens calldata
- `verify.ts`: verifySwap() — target, value, selector checks
- `stub-pricing.ts`: Pyth-based fallback (existing code, preserved)
- `types.ts`: SwapParams, SwapQuote, AerodromeQuote, AerodromeRoute
- `index.ts`: re-exports + createAerodrome() backward-compat wrapper
- **Backward compatible**: existing `import { aerodrome, createAerodrome }` still works

### Parser extension (packages/core/src/parser.ts)
- SWAP regex: `/^(?:swap|convert|trade)\s+([\d.]+)\s+(\w+)\s+(?:for|to|→|->)\s+(\w+)(?:\s+with\s+([\d.]+)%\s+slippage)?\s*$/i`
- Supports: "swap 100 USDC for ETH", "convert 0.5 ETH to USDC", "trade 50 USDC to ETH"
- Optional slippage suffix: "with 1% slippage"
- Case-insensitive, decimal amounts

### Executor extension (packages/core/src/executor.ts)
- `planSwap()` function: resolve tokens → validate → quote → build calls → run safety rings → return ConfirmationCard
- Token resolution: unknown symbols return actionable error ("Sherpa doesn't know about DAI yet. Try USDC, ETH, or WETH.")
- Slippage validation: min 0.1%, >5% surfaces high-slippage warning
- Aerodrome guard: graceful "SWAP isn't available on this network yet" when router unset
- Steps: approve (if ERC-20) + swap, EIP-5792 batch ready

### Error messages (packages/agentkit/src/errors.ts)
- SWAP_ERRORS: TOKEN_NOT_FOUND, PRICE_IMPACT_HIGH, POOL_NOT_FOUND, NETWORK_NOT_SUPPORTED, SLIPPAGE_TOO_LOW, SLIPPAGE_HIGH

### SwapPlan types (packages/core/src/types.ts)
- SwapPlan: type, fromAsset, toAsset, fromAmount, minOutAmount, expectedOutAmount, route, slippageBps, priceImpactBps, deadline, calls
- SwapRoute: provider, pools, stable flag

### Tests
- `packages/tools/src/aerodrome/quoter.test.ts` — 7 tests (USDC→ETH, ETH→USDC, registry, minOutAmount, same-asset, unknown token, Pyth)
- `packages/tools/src/aerodrome/swap-builder.test.ts` — 8 tests (calldata, quote metadata, route addresses, unconfigured, verify accept/reject)
- `packages/core/src/index.test.ts` — 15 new tests (SWAP parsing: 9, SWAP executor: 6)

## Cross-Domain Follow-ups

- **M2:** ConfirmationCard already renders multi-step plans (approve+swap = 2 steps). No UI changes expected. Worth a manual smoke test of the rendered SWAP card on localhost.
- **M3:** No API changes. POST /api/parse already accepts ParsedIntent with type='SWAP'. The plan() function in executor.ts handles the rest.

## What Didn't Ship (Deferred)

- **On-chain quoter**: Current pricing uses Pyth/stub. Real Aerodrome quoter view function integration comes when AERODROME_ROUTER_ADDRESS is set.
- **Multi-hop routing**: Single-hop only (USDC↔ETH). Multi-hop deferred to Stage 2.5.
- **Price impact calculation**: Stub pricing has 0% impact. Real quoter provides this.
- **Native ETH wrapping**: ETH→WETH wrapping for swaps where fromAsset is native ETH. Current impl maps ETH to WETH address directly.

## Metrics

- Files changed: 14
- Tests added: 30 (84 tools + 39 core = 123 total for M1 packages)
- Lines added: ~1200
