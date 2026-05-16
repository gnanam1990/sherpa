# Changelog

## v1.0.0 — Public Beta (2026-05-16)

### Features

#### Stage 1: Core Intents
- **SEND**: Send ETH and ERC-20 tokens to any address, ENS, or Basename
- **BALANCE**: Check wallet balance across all tokens
- **HISTORY**: View recent transaction history
- **IDENTITY_LOOKUP**: Resolve ENS, Basenames, and Farcaster profiles

#### Stage 2: DeFi Intents
- **SWAP**: Swap tokens via Aerodrome DEX
- **LEND**: Supply assets to Aave V3 to earn yield
- **BORROW**: Borrow against collateral on Aave V3
- **REPAY**: Repay borrowed assets on Aave V3
- **WITHDRAW**: Withdraw supplied assets from Aave V3

#### Stage 3: Multi-Surface
- **Web App**: Next.js 15 web interface
- **Farcaster Mini App**: Native Farcaster experience
- **Telegram Bot**: Telegram bot interface

#### Smart Contracts
- **SherpaRouter**: Core routing contract (Aerodrome + Aave integration)
- **SherpaTreasury**: Protocol fee collection and management
- **SafetyCheck**: Slippage and deadline validation library
- **FeeCalculator**: Fee calculation library

#### Safety & Security
- 7 safety rings for transaction validation
- Token allowlist system
- Per-transaction and per-day spend caps
- OFAC sanctions screening
- Tenderly transaction simulation
- 2-of-3 Safe multisig for contract ownership

### Infrastructure
- Fastify API on Railway
- Next.js web on Vercel
- PostgreSQL via Supabase
- Structured logging
- Sentry error tracking

### Documentation
- Audit preparation documents
- Threat model
- Deployment checklist
- API documentation

---

## v0.9.0 — Internal Beta (2026-05-01)

### Features
- Intent parser (38 intents)
- Core executor
- Safety ring framework
- Basic web interface

### Known Issues
- Session keys not implemented
- Automation (DCA, alerts) not running
- Multi-chain not supported

---

## v0.1.0 — Prototype (2026-04-15)

### Features
- Basic intent parsing
- Single-chain (Base Sepolia)
- Proof of concept
