# Sherpa

<p align="center">
  <img src="apps/web/public/sherpa-horizontal-logo.png" alt="Sherpa" width="360" />
</p>

> The natural-language Base agent.

[![Live](https://img.shields.io/badge/live-Base_Sepolia-blue)](https://sherpa-web.vercel.app)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Type plain English. Sherpa does it onchain.

Sherpa is a natural-language operating system for the Base L2 blockchain. Users type intent in English; Sherpa parses, validates, simulates, and executes onchain transactions via Coinbase Smart Wallet with sponsored gas.

## Status

| Stage | Description | Status | Details |
|---|---|---|---|
| **Stage 1** | SEND, BALANCE, HISTORY, IDENTITY_LOOKUP | ✅ Live (Base Sepolia) | [Stage Status](docs/sherpa/STAGE_STATUS.md) |
| **Stage 2** | DeFi (SWAP, LEND, BORROW, STAKE, BRIDGE, LP) | 🟡 Base Sepolia Deployed | Testnet audit target deployed 2026-05-16; gated behind audit + mainnet deploy |
| **Stage 3** | Multi-surface (Farcaster Mini App, Telegram bot) | 🟡 Code Complete | Pending platform account setup |
| **Stage 4** | Automation (DCA, ALERT, AUTO_REPAY) | 🔵 In Progress | Scheduler code present, not in production |
| **Stage 5** | Multi-chain, Session Keys, Strategy Marketplace | ⚪ Planned | Scaffolded |
| **Stage 6** | Portfolio Dashboard, Notifications, Fee Taker | ⚪ Planned | Scaffolded |
| **Stage 7** | Governance, Social, Automation Deep Dive | ⚪ Planned | Scaffolded |
| **Stage 8** | Developer API, Cross-chain, Mobile | ⚪ Planned | Scaffolded |
| **Stage 9** | Risk & Compliance | ⚪ Planned | Scaffolded |

**Stage 1 web is live on Base Sepolia.** Future stages are intentionally gated behind production config, audits, or separate deployments for safety.

## Deployment

| Network | Contracts | Status |
|---|---|---|
| Base Sepolia | [SherpaRouter](https://sepolia.basescan.org/address/0xDfe689ec2f0Ae3635C372DfaB7b6581bBb7c4032), [SherpaTreasury](https://sepolia.basescan.org/address/0x70A58169BF96587E55F500c4b5cb9d956Ef826ee) | Deployed 2026-05-16, verified, pending Code4rena audit |
| Base Mainnet | SherpaRouter, SherpaTreasury | Pending audit |

Base Sepolia uses a verified mock Aerodrome router for swap-path testing because Aerodrome does not provide an official Base Sepolia router. Deployment details are recorded in `deployments/base-sepolia.json`.

See `docs/sherpa/audit/05_mainnet_deployment.md` for deployment guide.

## Token Disclaimer

Sherpa does not have a token. Any SHERPA token claiming to be affiliated with this project is not official.

## Stage 1

| Intent          | Example                           |
| --------------- | --------------------------------- |
| SEND            | `send 5 usdc to vitalik.base.eth` |
| BALANCE         | `what's my balance`               |
| HISTORY         | `show my recent transactions`     |
| IDENTITY_LOOKUP | `who is vitalik.base.eth`         |

## Launch Links

| Item                  | Status                                      |
| --------------------- | ------------------------------------------- |
| Web URL               | https://sherpa-web.vercel.app               |
| API URL               | Railway deployment behind the web app proxy |
| First public smoke tx | Verified on Base Sepolia                    |
| Demo video            | Pending live URL smoke test                 |
| Farcaster Mini App    | Deployment pending account association      |
| Telegram bot          | Deployment pending BotFather token          |

## Quick Start

```bash
# Install
pnpm install

# Typecheck
pnpm typecheck

# Test
pnpm test

# Dev
pnpm --filter @sherpa/api dev
pnpm --filter @sherpa/web dev
```

## Environment Variables

See `apps/api/.env.example` and `apps/web/.env.example`.

## Documentation

### Audit & Launch
| Document | Description |
|---|---|
| [Audit Firm Selection](docs/sherpa/audit/01_audit_firm_selection.md) | Code4rena vs Spearbit vs Trail of Bits comparison |
| [Audit Scope](docs/sherpa/audit/02_audit_scope_document.md) | Contracts and functions in scope |
| [Threat Model](docs/sherpa/audit/03_threat_model.md) | Security threat analysis |
| [Known Issues](docs/sherpa/audit/04_known_issues.md) | Static analysis findings and accepted risks |
| [Mainnet Deployment](docs/sherpa/audit/05_mainnet_deployment.md) | Step-by-step deployment guide |
| [Safe Multisig Setup](docs/sherpa/audit/06_safe_multisig_setup.md) | 2-of-3 Safe configuration |
| [Smoke Testing](docs/sherpa/audit/07_smoke_testing.md) | Post-deployment verification |
| [Internal Beta](docs/sherpa/audit/08_internal_beta.md) | Beta user onboarding and feedback |

### Press & Launch
| Document | Description |
|---|---|
| [Press Kit](docs/sherpa/press/README.md) | Project description, screenshots, links |
| [Elevator Pitch](docs/sherpa/press/ELEVATOR_PITCH.md) | 30-second pitch |
| [Technical Overview](docs/sherpa/press/TECHNICAL_OVERVIEW.md) | Architecture for technical audience |
| [Announcement](docs/sherpa/launch/ANNOUNCEMENT.md) | Launch announcement draft |
| [Changelog](docs/sherpa/launch/CHANGELOG.md) | What's new in this release |
| [Migration Guide](docs/sherpa/launch/MIGRATION_GUIDE.md) | For existing users |
| [Stage Status](docs/sherpa/STAGE_STATUS.md) | Status of each development stage |

### Existing
- [Deployment Checklist](docs/sherpa/DEPLOYMENT_CHECKLIST.md)
- [Audit Preparation](docs/sherpa/AUDIT_PREPARATION.md)
- [Threat Model](docs/sherpa/THREAT_MODEL.md)
- [API Documentation](docs/sherpa/API.md)

## Architecture

```
sherpa/
├── apps/
│   ├── api/          Fastify HTTP API
│   ├── web/          Next.js 15 web app
│   ├── miniapp/      Farcaster Mini App
│   └── telegram-bot/ Telegram bot
├── packages/
│   ├── core/         Parser + types + executor
│   ├── tools/        30+ protocol adapters
│   ├── safety/       7 safety rings
│   ├── agentkit/     Planning + errors
│   ├── config/       Env schema
│   ├── memory/       Audit log + stores
│   ├── scheduler/    Cron jobs
│   ├── identity/     Farcaster + ENS + Basenames
│   ├── logger/       Structured logging
│   └── ui/           Shared components
└── scripts/db/       14 migrations
```

## License

MIT. See `LICENSE`.
