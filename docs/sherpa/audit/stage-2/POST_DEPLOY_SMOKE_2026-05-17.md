# Stage 2 Post-Deploy Smoke Results

Date: 2026-05-17
Network: Base mainnet (`8453`)
Run mode: contract verification, owner-control simulation, and tiny mainnet write smoke

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

## Tiny write smoke

Disposable smoke wallet: `0x8cEb9816e0fc666050d44216aE19690e02676BE1`

| Step | Hash | Status | Gas |
|---|---|---|---:|
| Fund disposable wallet with `0.001 ETH` | `0x356f3348edc6c3c416bdc11d834857e2126041061a9c78ad650720c588692f74` | success | 21,000 |
| Wrap `0.0002 ETH` to WETH | `0xdccd9125929fd692c5e64516318d0aa3a189847a288192ffc034c888a1b81852` | success | 44,866 |
| Approve Router for WETH supply | `0x93072e03e4991e91e4d933dcd48092d6b0c9310f4a036c80fb9b3ce0069dde28` | success | 46,007 |
| Router `supply(WETH, 0.00005)` | `0x753ca05446bb7407fc7c86d2d368908e9d35d4da756cdff41b2e52c854902bd5` | success | 212,450 |
| Approve Router for aWETH withdraw | `0x6fb70886f8ed6644f554546e039f0d95e0d95cb7976d7ea6ca6e6a977f36294d` | success | 51,373 |
| Router `withdraw(WETH, 0.00005)` | `0xe8cbc0cf8d3be5d2edc3d410e56c16d4802f40ce200e22498a81783265e0886d` | success | 275,372 |
| Approve Router for WETH swap | `0x91b69b4854897ee28fd03f8a0fc50386ef96a227160c425eec5439398c56aa90` | success | 46,007 |
| Router `swap(WETH -> USDC, 0.00005)` | `0xcd63bdd502fb36b2dab99a8b84425c082878d8e31d343d3a4f0d8ba2823db962` | success | 272,825 |

## Tiny write outcomes

| Check | Result |
|---|---|
| WETH after wrap | `200000000000000` |
| Aave position after supply | Collateral `10962094`, debt `0`, health factor max uint |
| aWETH dust after withdraw | `410270` |
| Aave position after withdraw | Collateral `0`, debt `0`, health factor max uint |
| WETH after swap | `150000000000000` |
| USDC received from swap | `108985` |
| Treasury WETH fee after swap | `50000000000` |

## Remaining rollout gates

The contract-level smoke passed, including real tiny writes. Production app flags
remain gated until Railway/Vercel/Sentry monitoring is watched during an
end-to-end app write from a private beta wallet.
