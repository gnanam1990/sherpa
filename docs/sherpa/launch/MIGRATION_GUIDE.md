# Migration Guide

## Overview

This guide is for users migrating from the testnet beta to the mainnet release, or from the v0.9 internal beta to v1.0 public beta.

## Testnet to Mainnet

### What Changes

| Item | Testnet | Mainnet |
|---|---|---|
| Network | Base Sepolia | Base Mainnet |
| Gas | Free (testnet faucet) | Sponsored (Coinbase Smart Wallet) |
| Tokens | Test tokens | Real tokens (USDC, WETH, DAI) |
| Limits | Unlimited | $100/tx, $1000/day |
| Contracts | Testnet deployment | Audited mainnet deployment |

### What Stays the Same

- Same web interface
- Same commands
- Same safety rings
- Same wallet connection

### Migration Steps

1. **Switch network**: Change wallet to Base Mainnet
2. **Fund wallet**: Transfer real tokens to your wallet
3. **Start small**: Test with $1 transactions first
4. **Verify**: Check transactions on basescan.org

### Important Notes

- Testnet tokens have no value
- Mainnet transactions use real tokens
- Start with small amounts
- Verify every transaction on Basescan

## Internal Beta to Public Beta

### What Changes

| Item | Internal Beta | Public Beta |
|---|---|---|
| Access | Invite only | Public |
| Users | 10-20 | Unlimited |
| Support | Direct DM | Community channels |
| Features | All Stage 1-2 | All Stage 1-2 |
| Limits | Relaxed | Production limits |

### New Features in Public Beta

- Production spend limits ($100/tx, $1000/day)
- Rate limiting (3 ops/24h)
- OFAC sanctions screening
- Enhanced error messages
- Improved intent parsing

### Breaking Changes

None. All commands remain the same.

## Wallet Migration

### From Coinbase Wallet to Coinbase Smart Wallet

If you're using the legacy Coinbase Wallet:

1. **Export private key** from legacy wallet
2. **Import** into Coinbase Smart Wallet
3. **Verify** balance and history
4. **Connect** to Sherpa

### From Other Wallets

Sherpa uses Coinbase Smart Wallet for sponsored gas. To use Sherpa:

1. **Create** Coinbase Smart Wallet at https://www.coinbase.com/wallet
2. **Fund** wallet with ETH and tokens on Base
3. **Connect** to Sherpa

## Token Migration

### From Ethereum Mainnet to Base

If your tokens are on Ethereum Mainnet:

1. **Bridge** tokens to Base using [Base Bridge](https://bridge.base.org)
2. **Wait** for confirmation (~10 minutes)
3. **Verify** balance on Base
4. **Use** with Sherpa

### Supported Tokens on Base

| Token | Address | Decimals |
|---|---|---|
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | 6 |
| WETH | `0x4200000000000000000000000000000000000006` | 18 |
| DAI | `0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb` | 18 |

## FAQ

### Do I need to create a new account?

No. Your existing Coinbase Smart Wallet works on both testnet and mainnet.

### Will my testnet transactions carry over?

No. Testnet and mainnet are separate chains. Your testnet history remains on Base Sepolia.

### What if I send tokens to the wrong address?

Sherpa validates recipient addresses and checks sanctions lists. However, always verify the recipient before confirming.

### How do I report issues?

- **Critical**: DM us directly
- **General**: Post in community channel
- **Bug report**: Use the bug report form

### What about the SHERPA token?

Sherpa does not have a token. Any SHERPA token claiming to be affiliated with this project is not official.
