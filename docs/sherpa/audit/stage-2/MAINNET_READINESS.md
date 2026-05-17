# Stage 2 Mainnet Readiness

Date: 2026-05-17

## Decision

**Status: BROADCAST COMPLETE.**

Sherpa Stage 2 contracts are deployed and verified on Base mainnet. Production
app write-flags remain blocked until post-deployment smoke tests, monitoring,
and rollback procedures are complete.

## What is ready

| Item | Status | Evidence |
|---|---|---|
| Remediated Stage 2 source | Ready | `stage-2-pre-audit-v1.0.0` |
| Patched Base Sepolia deployment | Ready | Router `0x7CfdE6a4D1A85236419d4343a3A466d0677A0056` |
| External review rounds | Complete | `AUDIT_REMEDIATION.md` |
| Mainnet deployment script | Prepared | `packages/contracts/script/DeployMainnet.s.sol` |
| Mainnet env template | Prepared | `packages/contracts/.env.example` |
| Mainnet deployment guide | Prepared | `docs/sherpa/audit/05_mainnet_deployment.md` |
| Final reviewer acknowledgement | Recorded | Screenshot provided 2026-05-17 |
| Base mainnet deployment | Complete | `deployments/base-mainnet.json` |

## Final reviewer acknowledgement

Reviewer response:

> Reviewed. No blocker to guarded Base mainnet deployment.

Verification summary in the acknowledgement confirms all listed Stage 2 review
findings are fixed, with 113 tests passing, Slither reporting 0 high / 0
critical findings, Router coverage at 96.94% lines, Treasury/Libraries at
100%, emergency pause added, and single-hop routing enforced.

## Local verification

Latest readiness pass:

| Check | Result |
|---|---|
| `forge build` | Passed |
| `pnpm --filter @sherpa/contracts build` | Passed |
| `forge test -vv` | 113 passed, 0 failed, 0 skipped |
| `pnpm --filter @sherpa/contracts test` | 113 passed, 0 failed, 0 skipped |
| `pnpm -r typecheck` | Passed |
| `pnpm -r build` | Passed with existing frontend dependency / lint warnings |

Latest mainnet dry-run:

| Item | Result |
|---|---|
| Dry-run command | `forge script script/DeployMainnet.s.sol --rpc-url "$BASE_MAINNET_RPC_URL" -vvvv` |
| Deployer | `0xFf525D6940Ad0e308ed6eda443c792694353F9Da` |
| Safe owner | `0x53918b7635d2d2c2882b213E3321c03887C98D73` |
| Predicted SherpaTreasury | `0xF4e72beAA559E1815f4671e39EDb1295aD975918` |
| Predicted SherpaRouter | `0x00bfef87DD352D48F8572BcfA52E57870B35DE8b` |
| Estimated gas used | `2,986,515` |
| Estimated gas price | `0.010000063 gwei` |
| Estimated required ETH | `0.000029865338150445 ETH` |
| Result | Simulation complete, no broadcast |

## Broadcast Gates

| Gate | Status | Required action |
|---|---|---|
| Final reviewer acknowledgement | Ready | Recorded above. |
| Fresh mainnet deployer | Ready | `0xFf525D6940Ad0e308ed6eda443c792694353F9Da`. Do not reuse any private key that appeared in chat, terminal history, screenshots, logs, or support tools. |
| Safe multisig | Ready | `0x53918b7635d2d2c2882b213E3321c03887C98D73` has code on Base mainnet. |
| Deployer funding | Ready | `0.011 ETH` observed before final dry-run. |
| Mainnet dry-run | Ready | Normal dry-run completed with no override and no broadcast. |
| Explicit operator approval | Complete | User provided exact phrase: `yes broadcast Stage 2 mainnet`. |
| Contract broadcast | Complete | Router and Treasury deployed, verified, allowlisted, and transferred to Safe. |
| Production simulation/monitoring | Active | Post-deploy smoke checks passed; continue monitoring Tenderly/Sentry/Railway after public traffic. |
| Production app env | Complete | Railway and Vercel were flipped to public Stage 2 mainnet after smoke tests passed. |

## Mainnet deployment record

| Item | Value |
|---|---|
| Network | Base mainnet (`8453`) |
| Block | `46110699` |
| SherpaRouter | `0x00bfef87DD352D48F8572BcfA52E57870B35DE8b` |
| SherpaTreasury | `0xF4e72beAA559E1815f4671e39EDb1295aD975918` |
| Safe owner | `0x53918b7635d2d2c2882b213E3321c03887C98D73` |
| Router deploy tx | `0x2a583197ab5280c35d943dcf57a248ab87e09373d31d472fa6c9d32c3e82de80` |
| Treasury deploy tx | `0x9b4ee6c4820f124c6bc21ef1e7182878e43ce31d349d0a392bd1c2220a694345` |
| Allowlist tx | `0xb2c60eaf0717c728c10c2fe2cf06cf91c3ad8422e24a229df8ccabf9cfed0f6c` |
| Router ownership tx | `0x4819954dc92a470fd9744996d39993e64c9ca14df19e51ac1942b5c2ab83ea77` |
| Treasury ownership tx | `0x86d121b81d7f3a80f9a2992154530d3df1686fd4d758bf1ad24a81377e5d00b1` |
| Verification | Both contracts verified on Basescan |
| Deployment artifact | `deployments/base-mainnet.json` |

## Verified mainnet external addresses

| Dependency | Address | Check |
|---|---|---|
| Aerodrome Router | `0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43` | Contract code exists; `weth()` returns Base WETH |
| Aave V3 Pool | `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5` | Contract code exists; `ADDRESSES_PROVIDER()` returns non-zero provider |
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | Contract code exists |
| WETH | `0x4200000000000000000000000000000000000006` | Contract code exists |
| DAI | `0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb` | Contract code exists |

## Deploy script safety controls

`DeployMainnet.s.sol`:

- Requires `block.chainid == 8453`
- Requires `MAINNET_SAFE_OWNER_ADDRESS`
- Requires the Safe address to already have contract code
- Requires `MAINNET_SAFE_OWNER_ADDRESS != deployer`
- Requires the deployer to hold at least `0.01 ETH` on Base mainnet by default
  (`MAINNET_MIN_DEPLOYER_BALANCE_WEI` can lower the guard for dry-runs only)
- Requires mainnet-specific env vars instead of Sepolia names
- Requires Aerodrome and Aave addresses to match expected Base mainnet values
- Requires protocol/token addresses to have bytecode
- Deploys SherpaTreasury and SherpaRouter
- Configures initial allowlist: USDC, WETH, DAI
- Transfers SherpaRouter and SherpaTreasury ownership to the Safe in the same broadcast run

## Pre-broadcast checklist

Run from repo root:

```bash
pnpm install --frozen-lockfile
pnpm -r typecheck
pnpm -r test
pnpm -r build
```

Run from `packages/contracts`:

```bash
forge build
forge test -vv
forge script script/DeployMainnet.s.sol --rpc-url $BASE_MAINNET_RPC_URL -vvvv
```

Only after the dry run succeeds and the signer set is reviewed should the
deployment be broadcast:

```bash
forge script script/DeployMainnet.s.sol \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  -vvvv
```

## Post-broadcast record

Create `deployments/base-mainnet.json` with:

```json
{
  "chainId": 8453,
  "deploymentDate": "<ISO timestamp>",
  "deployer": "0x...",
  "safeOwner": "0x...",
  "router": {
    "address": "0x...",
    "deployTx": "0x...",
    "verified": true,
    "basescanUrl": "https://basescan.org/address/0x..."
  },
  "treasury": {
    "address": "0x...",
    "deployTx": "0x...",
    "verified": true,
    "basescanUrl": "https://basescan.org/address/0x..."
  },
  "externalDependencies": {
    "aerodromeRouter": "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43",
    "aavePool": "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5"
  },
  "allowlist": {
    "tokens": [
      "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "0x4200000000000000000000000000000000000006",
      "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"
    ],
    "configured": true
  }
}
```

## Operator note

The mainnet deployer should be disposable after deployment. Once ownership is
transferred to the Safe and post-deploy checks pass, remove the deployer key
from local `.env` files and password-manager temporary notes.
