# Mainnet Deployment Guide

## Current Status

Stage 2 mainnet deployment is **prepared but not authorized**. Do not broadcast
until every prerequisite below is complete and recorded in
`docs/sherpa/audit/stage-2/MAINNET_READINESS.md`.

## Prerequisites

- [ ] External review rounds complete and remediation acknowledged
- [ ] Final external reviewer sign-off received
- [ ] All tests passing (`pnpm -r test`, `pnpm -r build`, `pnpm -r typecheck`)
- [ ] Foundry tests passing (`forge test -vv`)
- [ ] Safe multisig created on Base mainnet (see `06_safe_multisig_setup.md`)
- [ ] Fresh deployer wallet funded with ETH on Base mainnet (~0.01 ETH for gas)
- [ ] Environment variables configured
- [ ] No private key used for mainnet has appeared in chat, terminal history,
  screenshots, logs, or support tools

## Environment Setup

Create `.env` file in `packages/contracts/`:

```bash
DEPLOYER_PRIVATE_KEY=<fresh-mainnet-deployer-private-key>
BASE_MAINNET_RPC_URL=https://mainnet.base.org
BASESCAN_API_KEY=<your-basescan-api-key>
MAINNET_SAFE_OWNER_ADDRESS=<deployed-2-of-3-safe-on-base>

# External protocol addresses (Base mainnet)
MAINNET_AERODROME_ROUTER_ADDRESS=0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43
MAINNET_AAVE_POOL_ADDRESS=0xA238Dd80C259a72e81d7e4664a9801593F98d1c5
```

`DeployMainnet.s.sol` intentionally uses mainnet-specific env vars so Sepolia
values cannot be reused accidentally. It checks the chain id, checks the Safe is
already deployed, verifies expected protocol addresses, configures the initial
USDC/WETH/DAI allowlist, and transfers SherpaRouter/SherpaTreasury ownership to
the Safe in the same broadcast run.

## Step 1: Compile and Verify

```bash
cd packages/contracts

forge build
forge test -vv
git diff stage-2-pre-audit-v1.0.0 -- src/
```

The diff should be empty or explicitly reviewed before launch.

## Step 2: Dry Run

```bash
# Dry-run only. Do not include --broadcast.
forge script script/DeployMainnet.s.sol \
  --rpc-url $BASE_MAINNET_RPC_URL \
  -vvvv
```

Stop if the dry run reverts or if the predicted contract addresses are not
recorded in the launch log.

## Step 3: Deploy Contracts

```bash
forge script script/DeployMainnet.s.sol \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  -vvvv
```

Expected output:

```text
Deploying Stage 2 contracts to Base mainnet
Deployer: 0x...
Final Safe owner: 0x...
SherpaTreasury deployed to: 0x...
SherpaRouter deployed to: 0x...
Initial allowlist configured: USDC, WETH, DAI
Ownership transferred to Safe: 0x...
```

Record the deployment addresses and transaction hashes in
`deployments/base-mainnet.json`.

## Step 4: Verify on Basescan

If `--verify` did not complete automatically, verify manually:

```bash
forge verify-contract \
  <TREASURY_ADDRESS> \
  SherpaTreasury \
  --chain-id 8453 \
  --etherscan-api-key $BASESCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address)" <DEPLOYER_ADDRESS>)

forge verify-contract \
  <ROUTER_ADDRESS> \
  SherpaRouter \
  --chain-id 8453 \
  --etherscan-api-key $BASESCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address,address,address,address)" <DEPLOYER_ADDRESS> <AERODROME_ROUTER> <AAVE_POOL> <TREASURY_ADDRESS>)
```

## Step 5: Verify Ownership and Allowlist

```bash
cast call <ROUTER_ADDRESS> "owner()(address)" --rpc-url $BASE_MAINNET_RPC_URL
cast call <TREASURY_ADDRESS> "owner()(address)" --rpc-url $BASE_MAINNET_RPC_URL
cast call <ROUTER_ADDRESS> "AERODROME_ROUTER()(address)" --rpc-url $BASE_MAINNET_RPC_URL
cast call <ROUTER_ADDRESS> "AAVE_POOL()(address)" --rpc-url $BASE_MAINNET_RPC_URL
cast call <ROUTER_ADDRESS> "SHERPA_TREASURY()(address)" --rpc-url $BASE_MAINNET_RPC_URL
cast call <ROUTER_ADDRESS> "FEE_BPS()(uint256)" --rpc-url $BASE_MAINNET_RPC_URL
cast call <ROUTER_ADDRESS> "MIN_HEALTH_FACTOR()(uint256)" --rpc-url $BASE_MAINNET_RPC_URL
cast call <ROUTER_ADDRESS> "swapTokenAllowlist(address)(bool)" 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 --rpc-url $BASE_MAINNET_RPC_URL
cast call <ROUTER_ADDRESS> "swapTokenAllowlist(address)(bool)" 0x4200000000000000000000000000000000000006 --rpc-url $BASE_MAINNET_RPC_URL
cast call <ROUTER_ADDRESS> "swapTokenAllowlist(address)(bool)" 0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb --rpc-url $BASE_MAINNET_RPC_URL
```

Expected:

- Both `owner()` calls return `MAINNET_SAFE_OWNER_ADDRESS`
- Router immutables match the audited deployment record
- `FEE_BPS()` returns `10`
- `MIN_HEALTH_FACTOR()` returns `1500000000000000000`
- USDC, WETH, and DAI allowlist calls return `true`

## Step 6: Fee Treasury Setup

Fees accumulate in SherpaTreasury. Configure withdrawal schedule:

1. **Immediate**: No action needed, fees auto-accumulate
2. **Weekly**: Withdraw via Safe multisig
3. **Threshold**: Withdraw when balance > $1000

```bash
cast call <TREASURY_ADDRESS> \
  "balance(address)" \
  <TOKEN_ADDRESS> \
  --rpc-url $BASE_MAINNET_RPC_URL
```

## Post-Deployment Checklist

- [ ] Contracts verified on Basescan
- [ ] Ownership transferred to Safe multisig
- [ ] Token allowlist configured (USDC, WETH, DAI)
- [ ] Treasury balance readable
- [ ] Smoke tests passing (see `07_smoke_testing.md`)
- [ ] Monitoring configured (Sentry, Railway logs)
- [ ] Documentation updated with contract addresses

## Contract Addresses (Base Mainnet)

| Contract | Address | Basescan |
|---|---|---|
| SherpaRouter | `<to be filled>` | `<link>` |
| SherpaTreasury | `<to be filled>` | `<link>` |

## Contract Addresses (Base Sepolia)

| Contract | Address | Basescan |
|---|---|---|
| SherpaRouter | `0x7CfdE6a4D1A85236419d4343a3A466d0677A0056` | https://sepolia.basescan.org/address/0x7CfdE6a4D1A85236419d4343a3A466d0677A0056 |
| SherpaTreasury | `0x70A58169BF96587E55F500c4b5cb9d956Ef826ee` | https://sepolia.basescan.org/address/0x70A58169BF96587E55F500c4b5cb9d956Ef826ee |
