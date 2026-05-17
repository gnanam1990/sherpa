# Stage 2 Mainnet Readiness

Date: 2026-05-17

## Decision

**Status: NO-GO for broadcast.**

Sherpa Stage 2 is technically prepared for a guarded Base mainnet deployment,
but mainnet broadcasting remains blocked until the operational gates below are
complete.

## What is ready

| Item | Status | Evidence |
|---|---|---|
| Remediated Stage 2 source | Ready | `stage-2-pre-audit-v1.0.0` |
| Patched Base Sepolia deployment | Ready | Router `0x7CfdE6a4D1A85236419d4343a3A466d0677A0056` |
| External review rounds | Complete | `AUDIT_REMEDIATION.md` |
| Mainnet deployment script | Prepared | `packages/contracts/script/DeployMainnet.s.sol` |
| Mainnet env template | Prepared | `packages/contracts/.env.example` |
| Mainnet deployment guide | Prepared | `docs/sherpa/audit/05_mainnet_deployment.md` |

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

## Mainnet blockers

| Gate | Status | Required action |
|---|---|---|
| Final reviewer acknowledgement | Blocked | Send patched Sepolia deployment + remediation summary to reviewers and record acknowledgement. |
| Fresh mainnet deployer | Blocked | Create a new wallet. Do not reuse any private key that appeared in chat, terminal history, screenshots, logs, or support tools. |
| Safe multisig | Blocked | Create a 2-of-3 Safe on Base mainnet and record `MAINNET_SAFE_OWNER_ADDRESS`. |
| Deployer funding | Blocked | Fund fresh deployer with enough Base ETH for deployment and verification retries. |
| Production simulation/monitoring | Blocked | Confirm Tenderly, Sentry, Railway logs, and rollback ownership procedures. |
| Production app env | Blocked | Railway/Vercel must keep mainnet write flags disabled until smoke tests pass. |

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
- Requires the deployer to hold at least `0.01 ETH` on Base mainnet
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
