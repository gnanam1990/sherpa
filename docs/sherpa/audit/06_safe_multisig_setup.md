# Safe Multisig Setup

## Overview

Sherpa contracts use a 2-of-3 Safe multisig as the owner. This prevents single-key compromise from draining funds.

## Signers

| Role | Address | Purpose |
|---|---|---|
| Founder | `<founder-address>` | Primary operations |
| Trusted Party 1 | `<party-1-address>` | Backup signer |
| Trusted Party 2 | `<party-2-address>` | Backup signer |

**Threshold**: 2 of 3 — any 2 signers can execute transactions.

## Step 1: Create Safe on Base

### Via Safe UI (Recommended)

1. Go to [app.safe.global](https://app.safe.global)
2. Connect wallet
3. Click "Create new Safe"
4. Select **Base** network
5. Add 3 signer addresses
6. Set threshold to **2**
7. Name: `Sherpa Protocol`
8. Review and create
9. Pay gas (~0.001 ETH)

### Via CLI (Alternative)

```bash
# Install Safe CLI
pip install safe-cli

# Create Safe
safe-cli create <owner1>,<owner2>,<owner3> 2 base
```

## Step 2: Fund the Safe

```bash
# Send ETH for gas
cast send <SAFE_ADDRESS> \
  --value 0.01ether \
  --rpc-url https://mainnet.base.org \
  --private-key $DEPLOYER_PRIVATE_KEY
```

## Step 3: Transfer Contract Ownership

Execute from deployer wallet (before ownership transfer):

```bash
# Transfer SherpaRouter ownership
cast send <ROUTER_ADDRESS> \
  "transferOwnership(address)" \
  <SAFE_ADDRESS> \
  --rpc-url https://mainnet.base.org \
  --private-key $DEPLOYER_PRIVATE_KEY

# Transfer SherpaTreasury ownership
cast send <TREASURY_ADDRESS> \
  "transferOwnership(address)" \
  <SAFE_ADDRESS> \
  --rpc-url https://mainnet.base.org \
  --private-key $DEPLOYER_PRIVATE_KEY

# Verify ownership
cast call <ROUTER_ADDRESS> "owner()" --rpc-url https://mainnet.base.org
cast call <TREASURY_ADDRESS> "owner()" --rpc-url https://mainnet.base.org
```

## Step 4: Transaction Signing Workflow

### Example: Add Token to Allowlist

**Signer 1 initiates**:
1. Open [app.safe.global](https://app.safe.global)
2. Select `Sherpa Protocol` Safe
3. Go to **New Transaction** → **Contract Interaction**
4. Enter contract address: `<ROUTER_ADDRESS>`
5. Select function: `setSwapTokenAllowed(address,bool)`
6. Enter parameters: token address, `true`
7. Click **Create Transaction**
8. Sign with Signer 1's wallet

**Signer 2 approves**:
1. Open Safe UI
2. Navigate to **Transactions** → **Queue**
3. Review the pending transaction
4. Click **Confirm**
5. Sign with Signer 2's wallet
6. Transaction executes automatically (threshold met)

### Example: Withdraw Treasury Funds

```solidity
// Function: withdraw(address token, address to, uint256 amount)
// Parameters:
//   token: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (USDC)
//   to: <recipient-address>
//   amount: 1000000000 (1000 USDC, 6 decimals)
```

## Security Best Practices

### Signer Security
- Use hardware wallets (Ledger/Trezor) for all signers
- Never store private keys in plaintext
- Use unique wallets not tied to other DeFi activity
- Enable 2FA on all related accounts

### Operational Security
- Verify transaction details on-chain before signing
- Use Tenderly simulation for complex transactions
- Keep signers geographically distributed
- Document all transactions in shared log

### Emergency Procedures
- If 1 key compromised: Rotate that signer immediately (requires 2-of-3)
- If 2 keys compromised: Deploy new contracts, migrate funds
- Emergency contact: `<contact-info>`

## Safe Addresses

| Network | Safe Address | Safe UI Link |
|---|---|---|
| Base Mainnet | `<to be filled>` | `<link>` |
| Base Sepolia | `<to be filled>` | `<link>` |

## Monitoring

- Set up Safe email notifications for all signers
- Monitor Safe transaction queue daily
- Alert on unexpected transactions
- Review signer activity monthly
