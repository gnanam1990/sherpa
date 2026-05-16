# Technical Overview

## Architecture

Sherpa is a monorepo containing four applications and ten shared packages.

### Applications

| App | Stack | Purpose |
|---|---|---|
| `apps/api` | Fastify + TypeScript | HTTP API for intent parsing and execution |
| `apps/web` | Next.js 15 | Web interface |
| `apps/miniapp` | Farcaster SDK | Farcaster Mini App |
| `apps/telegram-bot` | Telegraf | Telegram bot |

### Packages

| Package | Purpose |
|---|---|
| `packages/core` | Intent parser, types, executor |
| `packages/tools` | 30+ protocol adapters (Aave, Aerodrome, Across, etc.) |
| `packages/safety` | 7 safety rings |
| `packages/agentkit` | Planning and error handling |
| `packages/config` | Environment schema |
| `packages/memory` | Audit log and stores |
| `packages/scheduler` | Cron jobs (DCA, alerts) |
| `packages/identity` | Farcaster, ENS, Basenames resolution |
| `packages/logger` | Structured logging |
| `packages/ui` | Shared React components |

## Intent Processing Pipeline

```
Input: "swap 10 USDC for ETH"
  │
  ▼
┌─────────────┐
│   Parser    │  Natural language → structured intent
└──────┬──────┘
  │
  ▼
┌─────────────┐
│   Planner   │  Select protocol, build transaction
└──────┬──────┘
  │
  ▼
┌─────────────┐
│ Safety Rings│  7 validation checks
└──────┬──────┘
  │
  ▼
┌─────────────┐
│  Simulator  │  Tenderly dry-run
└──────┬──────┘
  │
  ▼
┌─────────────┐
│  Executor   │  Submit via Coinbase Smart Wallet
└──────┬──────┘
  │
  ▼
Output: Transaction hash on Base
```

## Safety Rings

| Ring | Check | Fail Action |
|---|---|---|
| 1 | Allowlist | Reject if target not approved |
| 2 | Amount caps | Reject if > $100/tx or > $1000/day |
| 3 | Rate limiting | Reject if > 3 ops/24h |
| 4 | Recipient validation | Reject if sanctioned (OFAC) |
| 5 | Risk badges | Flag high-risk operations |
| 6 | Simulation | Reject if Tenderly simulation fails |
| 7 | User confirmation | Require explicit approval |

## Smart Contracts

### SherpaRouter (Base L2)

Core routing contract integrating Aerodrome (swaps) and Aave (lending/borrowing).

- **Fee**: 10 bps (0.1%)
- **Slippage bounds**: 10-500 bps (0.1%-5%)
- **Health factor minimum**: 1.2
- **Access**: Owner-only admin functions, public user functions

### SherpaTreasury (Base L2)

Holds protocol fees collected by SherpaRouter.

- **Withdrawals**: Owner-only
- **Batch operations**: Supported

## External Integrations

| Protocol | Purpose | Contract |
|---|---|---|
| Aerodrome V2 | DEX swaps | `0xcF77a3Ba9A5CA399B7c97c74d58e6B70f0B5b12C` |
| Aave V3 | Lending/borrowing | `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5` |
| Across | Cross-chain bridging | Via SDK |
| Coinbase Smart Wallet | Account abstraction | Via OnchainKit |
| Tenderly | Transaction simulation | Via API |

## Database

PostgreSQL via Supabase with 14 migrations.

Key tables:
- `intents` — Parsed user intents
- `transactions` — Onchain transaction records
- `audit_log` — Safety ring results
- `users` — User profiles and settings

## Deployment

- **API**: Railway
- **Web**: Vercel
- **Contracts**: Foundry (Base L2)
- **Database**: Supabase

## Security

- OpenZeppelin contracts (Ownable, ReentrancyGuard, SafeERC20)
- 2-of-3 Safe multisig for contract ownership
- Tenderly simulation on mainnet (fail-closed)
- OFAC sanctions checking
- Per-transaction and per-day spend caps

## License

MIT
