# Stage Status

## Overview

Sherpa is built in 9 stages. This document tracks what is actually live, what remains read-only/beta, and what still needs production hardening.

## Status Legend

| Status                 | Meaning                                                        |
| ---------------------- | -------------------------------------------------------------- |
| ✅ Live                | Deployed and accessible in the stated scope                    |
| 🟡 Testnet / Read-only | Usable without mainnet write risk                              |
| 🔵 Beta / Partial      | Visible or partially wired, but not a full production workflow |
| ⚪ Planned             | Scaffolded or scheduled for future work                        |
| ❌ Blocked             | Blocked by dependency                                          |

## Stage Status

| Stage       | Description                                           | Status                 | Target / Gate                                                   |
| ----------- | ----------------------------------------------------- | ---------------------- | --------------------------------------------------------------- |
| **Stage 1** | SEND, BALANCE, HISTORY, IDENTITY_LOOKUP               | ✅ Live                | Live on Base Sepolia                                            |
| **Stage 2** | DeFi positions + writes                               | ✅ Live on Base mainnet | Public mainnet cards with guarded amount caps and verified contracts |
| **Stage 3** | Multi-surface (Farcaster/Base Mini App, Telegram bot) | ✅ Live                | Ongoing listing/discovery polish                                |
| **Stage 4** | Automation (DCA, ALERT, AUTO_REPAY)                   | 🔵 Beta / Partial      | Production workers + notifications + execution audit            |
| **Stage 5** | Multi-chain, Session Keys, Strategy Marketplace       | 🔵 Partial             | Read-only chain explorer live; session keys/marketplace pending |
| **Stage 6** | Portfolio Dashboard, Notifications, Fee Taker         | 🔵 Partial             | Production notification channels + fee taker pending            |
| **Stage 7** | Governance, Social, Automation Deep Dive              | 🔵 Partial             | Read-only proposal browsing live; write actions pending         |
| **Stage 8** | Developer API, Cross-chain, Mobile                    | ⚪ Planned             | Post Stage 7                                                    |
| **Stage 9** | Risk & Compliance                                     | ⚪ Planned             | Post Stage 8                                                    |

## Stage Details

### Stage 1: Core Intents ✅ Live

**What's live**:

- SEND: Transfer USDC on Base Sepolia
- BALANCE: Check wallet balance
- HISTORY: View transaction history
- IDENTITY_LOOKUP: Resolve ENS, Basenames, and Farcaster profiles
- Coinbase Smart Wallet + sponsored gas

**Where**:

- Web app: https://sherpa-web.vercel.app
- Network: Base Sepolia

**Dependencies**: None

---

### Stage 2: DeFi Intents ✅ Live on Base mainnet

**What's live**:

- POSITIONS: Read-only Aave V3 account data on Base mainnet
- SWAP: Base mainnet via verified SherpaRouter and Aerodrome
- LEND: Base mainnet supply flow through verified SherpaRouter and Aave V3
- BORROW: Base mainnet borrow flow through verified SherpaRouter and Aave V3
- REPAY: Base mainnet repay flow through verified SherpaRouter and Aave V3
- WITHDRAW: Base mainnet withdraw flow through verified SherpaRouter and Aave V3

**Safety boundary**:

- Public rollout is explicit via `SHERPA_STAGE_2_ENABLED=true` and `SHERPA_STAGE_2_PUBLIC_MAINNET=true`
- Mainnet cards use guarded amount caps and tell users they pay network gas
- Stage 1 sponsored send remains on Base Sepolia

**Contracts**:

- Base Sepolia SherpaRouter: https://sepolia.basescan.org/address/0xDfe689ec2f0Ae3635C372DfaB7b6581bBb7c4032
- Base Sepolia SherpaTreasury: https://sepolia.basescan.org/address/0x70A58169BF96587E55F500c4b5cb9d956Ef826ee
- Base Mainnet SherpaRouter: https://basescan.org/address/0x00bfef87DD352D48F8572BcfA52E57870B35DE8b
- Base Mainnet SherpaTreasury: https://basescan.org/address/0xF4e72beAA559E1815f4671e39EDb1295aD975918
- Deployment artifact: `deployments/base-sepolia.json`
- Mainnet deployment artifact: `deployments/base-mainnet.json`

**Dependencies**: Stage 1 live, external reviews remediated, Safe ownership verified, production env flags enabled

---

### Stage 3: Multi-Surface ✅ Live

**What's live**:

- Farcaster/Base Mini App: https://sherpa-miniapp.vercel.app
- Telegram bot: https://t.me/sherpaonbasebot
- Web sign/link flows for surface handoff

**What's still being polished**:

- Platform discovery/listing polish
- Production monitoring and operational hardening

**Dependencies**: Stage 1 live

---

### Stage 4: Automation 🔵 Beta / Partial

**What's visible**:

- Alerts setup surface
- DCA scheduler setup surface
- Auto-repay setup surface

**What's built**:

- Scheduler code and memory models
- Alert framework
- Auto-repay rule configuration

**What's blocking production execution**:

- Production scheduler deployment
- Notification delivery channels
- Worker monitoring and recovery
- External audit before automated execution

**Dependencies**: Stage 2 production writes

---

### Stage 5: Multi-chain & Session Keys 🔵 Partial

**What's live**:

- Read-only multi-chain explorer surfaces

**What's pending**:

- Multi-chain write execution
- Session keys for automated transactions
- Strategy marketplace

**Dependencies**: Stage 4 live

---

### Stage 6: Portfolio & Notifications 🔵 Partial

**What's built**:

- Portfolio and notification scaffolds
- Channel abstractions for future push/email/Farcaster/Telegram delivery

**What's pending**:

- Production notification channel delivery
- Fee taker module
- Full portfolio dashboard rollout

**Dependencies**: Stage 5 live

---

### Stage 7: Governance & Social 🔵 Partial

**What's live**:

- Read-only governance proposal browser

**What's pending**:

- Voting and delegation transactions
- Social write actions
- Deep automation

**Dependencies**: Stage 6 live

---

### Stage 8: Developer Platform ⚪ Planned

**What's planned**:

- Developer API/SDK
- Cross-chain routing
- Mobile app

**Dependencies**: Stage 7 live

---

### Stage 9: Risk & Compliance ⚪ Planned

**What's planned**:

- Risk management framework
- Compliance tooling
- Enterprise features

**Dependencies**: Stage 8 live

---

## What's Live vs What's Pending

### Live Now

- Web app at https://sherpa-web.vercel.app
- Stage 1 intents: SEND, BALANCE, HISTORY, IDENTITY_LOOKUP
- Aave positions read-only on Base mainnet
- Stage 2 swap/lend/borrow/repay/withdraw cards on Base mainnet
- Stage 2 contracts deployed, verified, and Safe-owned on Base mainnet
- Farcaster/Base Mini App
- Telegram bot
- Coinbase Smart Wallet integration
- Sponsored gas
- Read-only multi-chain and governance views

### Pending Production Hardening

- Continued production monitoring/rollback drills
- Scheduler workers
- Notification delivery channels
- Auto-repay execution
- DCA execution
- Monitoring and recovery loops

### Planned

- Session keys
- Strategy marketplace
- Developer API/SDK
- Mobile app
- Risk/compliance enterprise workflows
