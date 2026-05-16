# Stage Status

## Overview

Sherpa is built in 9 stages. This document tracks the status of each stage.

## Status Legend

| Status | Meaning |
|---|---|
| ✅ Live | Deployed and accessible |
| 🟡 Code Complete | Code written, not deployed |
| 🔵 In Progress | Under active development |
| ⚪ Planned | Scheduled for future |
| ❌ Blocked | Blocked by dependency |

## Stage Status

| Stage | Description | Status | Target Date |
|---|---|---|---|
| **Stage 1** | SEND, BALANCE, HISTORY, IDENTITY_LOOKUP | ✅ Live | 2026-05-16 |
| **Stage 2** | DeFi (SWAP, LEND, BORROW, STAKE, BRIDGE, LP) | 🟡 Code Complete | 2026-06-01 |
| **Stage 3** | Multi-surface (Farcaster Mini App, Telegram bot) | 🟡 Code Complete | 2026-06-15 |
| **Stage 4** | Automation (DCA, ALERT, AUTO_REPAY) | 🔵 In Progress | 2026-07-01 |
| **Stage 5** | Multi-chain, Session Keys, Strategy Marketplace | ⚪ Planned | 2026-08-01 |
| **Stage 6** | Portfolio Dashboard, Notifications, Fee Taker | ⚪ Planned | 2026-09-01 |
| **Stage 7** | Governance, Social, Automation Deep Dive | ⚪ Planned | 2026-10-01 |
| **Stage 8** | Developer API, Cross-chain, Mobile | ⚪ Planned | 2026-11-01 |
| **Stage 9** | Risk & Compliance | ⚪ Planned | 2026-12-01 |

## Stage Details

### Stage 1: Core Intents ✅ Live

**What's live**:
- SEND: Transfer ETH and ERC-20 tokens
- BALANCE: Check wallet balance
- HISTORY: View transaction history
- IDENTITY_LOOKUP: Resolve ENS/Basenames/Farcaster

**Where**:
- Web app: https://sherpa-web.vercel.app
- Network: Base Sepolia

**Dependencies**: None

---

### Stage 2: DeFi Intents 🟡 Code Complete

**What's built**:
- SWAP: Token swaps via Aerodrome
- LEND: Supply to Aave V3
- BORROW: Borrow from Aave V3
- REPAY: Repay Aave loans
- WITHDRAW: Withdraw from Aave

**What's blocking**:
- Smart contract audit
- Mainnet deployment
- Token allowlist configuration

**Dependencies**: Stage 1 live, audit complete

---

### Stage 3: Multi-Surface 🟡 Code Complete

**What's built**:
- Farcaster Mini App
- Telegram bot

**What's blocking**:
- Farcaster Mini App account association
- Telegram BotFather token

**Dependencies**: Stage 1 live

---

### Stage 4: Automation 🔵 In Progress

**What's built**:
- DCA scheduler code
- Alert framework
- Auto-repay logic

**What's blocking**:
- Production scheduler deployment
- Monitoring infrastructure

**Dependencies**: Stage 2 live

---

### Stage 5: Multi-chain & Session Keys ⚪ Planned

**What's planned**:
- Multi-chain support (Arbitrum, Optimism, Polygon)
- Session keys for automated transactions
- Strategy marketplace

**Dependencies**: Stage 4 live

---

### Stage 6: Portfolio & Notifications ⚪ Planned

**What's planned**:
- Portfolio dashboard
- Push notifications
- Fee taker module

**Dependencies**: Stage 5 live

---

### Stage 7: Governance & Social ⚪ Planned

**What's planned**:
- Governance framework
- Social features
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

## Timeline Summary

| Quarter | Milestone |
|---|---|
| Q2 2026 | Stage 1 live, Stage 2-3 code complete |
| Q3 2026 | Stage 2-3 live, Stage 4-5 in progress |
| Q4 2026 | Stage 4-5 live, Stage 6-7 in progress |
| Q1 2027 | Stage 6-7 live, Stage 8-9 in progress |

## What's Live vs What's Pending

### Live Now
- Web app on Base Sepolia
- Stage 1 intents (SEND, BALANCE, HISTORY, IDENTITY_LOOKUP)
- Coinbase Smart Wallet integration
- Sponsored gas

### Pending (Code Complete)
- Stage 2 DeFi intents (awaiting audit + mainnet deploy)
- Stage 3 multi-surface (awaiting platform accounts)

### In Development
- Stage 4 automation (scheduler code exists, not running in production)

### Planned
- Stages 5-9 (scaffolded, not yet implemented)
