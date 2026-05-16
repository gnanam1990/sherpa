# Mainnet Deployment Guide

## Prerequisites

- [ ] Audit complete and findings addressed
- [ ] All tests passing (`forge test`)
- [ ] Safe multisig created (see `06_safe_multisig_setup.md`)
- [ ] Deployer wallet funded with ETH on Base mainnet (~0.01 ETH for gas)
- [ ] Environment variables configured

## Environment Setup

Create `.env` file in `packages/contracts/`:

```bash
DEPLOYER_PRIVATE_KEY=<your-deployer-private-key>
BASE_RPC_URL=https://mainnet.base.org
BASESCAN_API_KEY=<your-basescan-api-key>

# External protocol addresses (Base Mainnet)
AERODROME_ROUTER_ADDRESS=0xcF77a3Ba9A5CA399B7c97c74d58e6B70f0B5b12C
AAVE_POOL_ADDRESS=0xA238Dd80C259a72e81d7e4664a9801593F98d1c5

# Optional: existing treasury address
# SHERPA_TREASURY_ADDRESS=<address>
```

## Step 1: Compile and Verify

```bash
cd packages/contracts

# Compile
forge build

# Run tests
forge test -vvv

# Verify compilation matches audited code
git diff <audit-commit> -- src/
```

## Step 2: Deploy Contracts

```bash
# Deploy to Base Mainnet
forge script script/DeployMainnet.s.sol \
  --rpc-url $BASE_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  -vvvv
```

**Expected output**:
```
Deploying with account: 0x...
SherpaTreasury deployed to: 0x...
SherpaRouter deployed to: 0x...
```

**Record these addresses** — you'll need them for configuration.

## Step 3: Verify on Basescan

If `--verify` flag didn't work, verify manually:

```bash
# Verify SherpaTreasury
forge verify-contract \
  <TREASURY_ADDRESS> \
  SherpaTreasury \
  --chain-id 8453 \
  --etherscan-api-key $BASESCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address)" <OWNER_ADDRESS>)

# Verify SherpaRouter
forge verify-contract \
  <ROUTER_ADDRESS> \
  SherpaRouter \
  --chain-id 8453 \
  --etherscan-api-key $BASESCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(address,address,address,address)" <OWNER_ADDRESS> <AERODROME_ROUTER> <AAVE_POOL> <TREASURY_ADDRESS>)
```

## Step 4: Transfer Ownership to Safe

```bash
# Transfer SherpaRouter ownership
cast send <ROUTER_ADDRESS> \
  "transferOwnership(address)" \
  <SAFE_ADDRESS> \
  --rpc-url $BASE_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY

# Transfer SherpaTreasury ownership
cast send <TREASURY_ADDRESS> \
  "transferOwnership(address)" \
  <SAFE_ADDRESS> \
  --rpc-url $BASE_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY
```

## Step 5: Configure Token Allowlist

Using Safe multisig (see `06_safe_multisig_setup.md`):

```bash
# Allow USDC
cast send <ROUTER_ADDRESS> \
  "setSwapTokenAllowed(address,bool)" \
  0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 true \
  --rpc-url $BASE_RPC_URL

# Allow WETH
cast send <ROUTER_ADDRESS> \
  "setSwapTokenAllowed(address,bool)" \
  0x4200000000000000000000000000000000000006 true \
  --rpc-url $BASE_RPC_URL

# Allow DAI
cast send <ROUTER_ADDRESS> \
  "setSwapTokenAllowed(address,bool)" \
  0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb true \
  --rpc-url $BASE_RPC_URL

# Batch allowlist (recommended)
cast send <ROUTER_ADDRESS> \
  "batchSetSwapTokenAllowed(address[],bool[])" \
  "[0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,0x4200000000000000000000000000000000000006,0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb]" \
  "[true,true,true]" \
  --rpc-url $BASE_RPC_URL
```

## Step 6: Fee Treasury Setup

Fees accumulate in SherpaTreasury. Configure withdrawal schedule:

1. **Immediate**: No action needed, fees auto-accumulate
2. **Weekly**: Withdraw via Safe multisig
3. **Threshold**: Withdraw when balance > $1000

```bash
# Check treasury balance
cast call <TREASURY_ADDRESS> \
  "balance(address)" \
  <TOKEN_ADDRESS> \
  --rpc-url $BASE_RPC_URL
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
| SherpaRouter | `<to be filled>` | `<link>` |
| SherpaTreasury | `<to be filled>` | `<link>` |
