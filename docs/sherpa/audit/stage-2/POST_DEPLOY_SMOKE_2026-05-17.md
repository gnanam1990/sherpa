# Stage 2 Post-Deploy Smoke Results

Date: 2026-05-17
Network: Base mainnet (`8453`)
Run mode: non-destructive contract and owner-control verification

## Contracts

| Item | Address |
|---|---|
| SherpaRouter | `0x00bfef87DD352D48F8572BcfA52E57870B35DE8b` |
| SherpaTreasury | `0xF4e72beAA559E1815f4671e39EDb1295aD975918` |
| Safe owner | `0x53918b7635d2d2c2882b213E3321c03887C98D73` |

## Read-only checks

| Check | Result |
|---|---|
| Router owner | `0x53918b7635d2d2c2882b213E3321c03887C98D73` |
| Treasury owner | `0x53918b7635d2d2c2882b213E3321c03887C98D73` |
| Router paused | `false` |
| `FEE_BPS` | `10` |
| `MIN_HEALTH_FACTOR` | `1500000000000000000` |
| USDC allowlisted | `true` |
| WETH allowlisted | `true` |
| DAI allowlisted | `true` |
| Router USDC balance | `0` |
| Treasury USDC balance | `0` |

## Transaction receipt checks

| Transaction | Hash | Status |
|---|---|---|
| Router deploy | `0x2a583197ab5280c35d943dcf57a248ab87e09373d31d472fa6c9d32c3e82de80` | success |
| Treasury deploy | `0x9b4ee6c4820f124c6bc21ef1e7182878e43ce31d349d0a392bd1c2220a694345` | success |
| Initial allowlist | `0xb2c60eaf0717c728c10c2fe2cf06cf91c3ad8422e24a229df8ccabf9cfed0f6c` | success |

## Owner-control simulations

The following checks used `eth_call` only. They did not broadcast transactions or change contract state.

| Check | Result |
|---|---|
| Safe can call `pause()` on Router | PASS |
| Safe can call `setSwapTokenAllowed(USDC, true)` on Router | PASS |
| Non-owner call to `pause()` reverts | PASS |

## Guardrail simulations

The following checks used `eth_call` only.

| Check | Result |
|---|---|
| `supply(nonAllowedToken, 1)` reverts | PASS |
| `supply(USDC, 0)` reverts | PASS |

## Not executed

Tiny mainnet write tests were not executed in this run because no dedicated
funded disposable smoke wallet was configured. The deployer wallet had ETH but
zero USDC/WETH/DAI and should not be reused for product smoke activity.

Before enabling app-level mainnet writes, run:

1. A tiny swap through SherpaRouter with a disposable wallet.
2. A tiny Aave supply through SherpaRouter with the same disposable wallet.
3. A health-factor read after supply.
4. Treasury fee balance verification after swap.
5. Railway/Vercel/Sentry log checks during each write.

Production flags remain gated until the write smoke tests and monitoring checks
are complete.
