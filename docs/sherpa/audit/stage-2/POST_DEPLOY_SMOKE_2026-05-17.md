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

## Tiny borrow / repay smoke

The same disposable wallet supplied WETH collateral, delegated USDC variable
debt allowance to SherpaRouter, borrowed a tiny USDC amount, repaid it, and
withdrew the WETH collateral.

| Step | Hash | Status | Gas |
|---|---|---|---:|
| Approve Router for WETH collateral supply | `0x3046ae337294d85e8ee986e290417add5d666c9022b43e056bcf614e4c8aa302` | success | 46,007 |
| Router `supply(WETH, 0.0001)` | `0x501acef56e7769614412aa9261240908aa18a1b8bf057c7d201619cfb42d7cdf` | success | 174,372 |
| Approve USDC variable-debt delegation to Router | `0x02ffd6e70349622295875c54dc215e4bf4cf1604f8a854862cd6b4e14a92f64f` | success | 53,707 |
| Router `borrow(USDC, 0.01, variable)` | `0x8a68a091c108146b6b816d13c40faf8857d35706e6a76dfb7570ab68d5060d0d` | success | 354,513 |
| Approve Router for USDC repay | `0x7e35a86760c18e6f018cadfb57f36dd4b1af0b9f80162576e5ede90678b4cdaf` | success | 55,413 |
| Router `repay(USDC, 0.02, variable)` | `0xdb267f0347c65ce64a70be9eb34adcba51d43fb48a9c38c9c0aab02ca504a789` | success | 220,322 |
| Approve Router for final aWETH withdraw | `0xbbac6a56876e0260a43f11ff3d5e0ac28101b8c16a956b17fa15843ceaff0b77` | success | 51,373 |
| Router `withdraw(WETH, 0.0001)` | `0xb35b41883c121dc89ac46a458999dc77d7db4177097a407fde22b7c640d80aa3` | success | 258,272 |

| Check | Result |
|---|---|
| Position after borrow | Collateral `21924189`, debt `999951`, health factor `18197968570459952537` |
| Position after repay | Collateral `21924189`, debt `0`, health factor max uint |
| Position after final withdraw | Collateral `0`, debt `0`, health factor max uint |

## Smoke wallet sweep

The disposable wallet's remaining liquid balances were swept back to the daily
Base wallet `0x99f37717f2EB28955CFB553f3B7Eb4eFaDf4dA8C`.

| Step | Hash | Status | Gas |
|---|---|---|---:|
| Sweep USDC | `0x8fe5ad66eeec3e49cea839151b0385e42de817b609fc670189aff9eb0f135a72` | success | 40,259 |
| Unwrap remaining WETH | `0x3bb70d13ca078c13c5b12adf7dffcf8558e5ee9714f2880b1c6ca0a8976d1993` | success | 30,316 |
| Sweep ETH | `0x265a7f934d8e8f8799b0ee4d4e24f4875f255ff25c6df4b5a91f368153de3605` | success | 25,814 |
| Final ETH dust sweep | `0xd7c78812da4842aadf878b2493bcc406433372c2fb3fbe9122a6cc10125dde27` | success | 25,814 |

Final disposable wallet balances:

| Asset | Balance |
|---|---:|
| ETH | `29859939776262` wei |
| WETH | `0` |
| USDC | `0` |
| aWETH dust | `2371052` wei |

## Remaining rollout gates

The contract-level smoke passed, including real tiny writes across swap, supply,
withdraw, borrow, and repay. Production app flags remain gated until
Railway/Vercel/Sentry monitoring is watched during an end-to-end app write from
a private beta wallet.
