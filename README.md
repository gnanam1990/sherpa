# Sherpa

<p align="center">
  <img src="apps/web/public/sherpa-horizontal-logo.png" alt="Sherpa" width="360" />
</p>

> The natural-language Base agent.

[![Live](https://img.shields.io/badge/live-Base-blue)](https://sherpa-web.vercel.app)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Type plain English. Sherpa does it onchain.

Sherpa is a natural-language agent for the Base L2 blockchain. Users type intent in English; Sherpa parses and validates the request, then either executes supported Base actions through Coinbase Smart Wallet, returns safe read-only data, or clearly marks gated flows before any wallet prompt.

## Status

Sherpa is live with two production boundaries: Stage 1 send remains on Base Sepolia with sponsored gas, and Stage 2 DeFi writes run on Base mainnet through verified contracts with guarded amount caps and wallet confirmation cards.

| Stage       | Description                                           | Status                      | Details                                                                                                                                      |
| ----------- | ----------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stage 1** | SEND, BALANCE, HISTORY, IDENTITY_LOOKUP               | ✅ Live (Base Sepolia)      | Web app, Smart Wallet, sponsored gas, identity resolution, balance/history                                                                   |
| **Stage 2** | Positions + DeFi writes                               | ✅ Live (Base mainnet)       | Aave positions are read-only. Swap/lend/borrow/repay/withdraw build Base mainnet confirmation cards through verified Sherpa contracts with guarded caps |
| **Stage 3** | Multi-surface (Farcaster/Base Mini App, Telegram bot) | ✅ Live                     | Mini App deployed at `sherpa-miniapp.vercel.app`; Telegram bot online at `@sherpaonbasebot`                                                  |
| **Stage 4** | Automation (DCA, ALERT, AUTO_REPAY)                   | 🔵 Beta live                | Alert/DCA/auto-repay setup screens exist. Railway worker is live with Postgres persistence; Telegram alert delivery is verified; session-key execution remains gated |
| **Stage 5** | Multi-chain, Session Keys, Strategy Marketplace       | 🔵 Partial                  | Multi-chain explorer is read-only. Durable session-key metadata API is live; signing/execution and strategy marketplace remain pending        |
| **Stage 6** | Portfolio Dashboard, Notifications, Fee Taker         | 🔵 Partial                  | Portfolio/notification scaffolds exist. Telegram alert delivery is live; Farcaster/email/browser push and fee taker remain pending           |
| **Stage 7** | Governance, Social, Automation Deep Dive              | 🔵 Partial                  | Governance proposal browser is read-only. Voting/delegation/social writes remain pending                                                     |
| **Stage 8** | Developer API, Cross-chain, Mobile                    | ⚪ Planned                  | Scaffolded                                                                                                                                   |
| **Stage 9** | Risk & Compliance                                     | ⚪ Planned                  | Scaffolded                                                                                                                                   |

See [Stage Status](docs/sherpa/STAGE_STATUS.md) for the fuller breakdown.

## Live Surfaces

| Surface                 | URL                                         | Status                                             |
| ----------------------- | ------------------------------------------- | -------------------------------------------------- |
| Web app                 | https://sherpa-web.vercel.app               | Live                                               |
| API                     | https://sherpaapi-production.up.railway.app | Live behind the web app                            |
| Automation worker       | https://sherpa-worker-production.up.railway.app/health | Live on Railway with Postgres-backed loops         |
| Farcaster/Base Mini App | https://sherpa-miniapp.vercel.app           | Live app surface; discovery/listing polish ongoing |
| Farcaster profile       | https://farcaster.xyz/sherpaonbase          | Live                                               |
| Telegram bot            | https://t.me/sherpaonbasebot                | Live on Railway                                    |

## Deployment

| Network      | Contracts                                                                                                                                                                                          | Status                                                 |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Base Sepolia | [SherpaRouter](https://sepolia.basescan.org/address/0x7CfdE6a4D1A85236419d4343a3A466d0677A0056), [SherpaTreasury](https://sepolia.basescan.org/address/0x70A58169BF96587E55F500c4b5cb9d956Ef826ee) | Patched deployment 2026-05-17, verified, external reviews remediated |
| Base Mainnet | [SherpaRouter](https://basescan.org/address/0x00bfef87DD352D48F8572BcfA52E57870B35DE8b), [SherpaTreasury](https://basescan.org/address/0xF4e72beAA559E1815f4671e39EDb1295aD975918)                  | Deployed 2026-05-17, verified, owned by Safe          |

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

## Current Feature Boundary

| Feature                   | Current behavior                                             |
| ------------------------- | ------------------------------------------------------------ |
| Send tokens               | Live on Base Sepolia with sponsored gas                      |
| Aave positions            | Read-only live against Base mainnet Aave V3                  |
| Swap / lend / borrow      | Live on Base mainnet through verified SherpaRouter            |
| Repay / withdraw          | Live on Base mainnet through verified SherpaRouter            |
| Alerts / DCA / auto-repay | Beta setup surfaces; Railway worker live with Postgres persistence; Telegram alerts verified; autonomous DCA/auto-repay execution waits on session-key signing |
| Session keys              | Durable registration/list/revoke/usage API live; no server-generated fake keys; unattended signing remains gated |
| Multi-chain / governance  | Read-only discovery views                                    |
| Mainnet DeFi writes       | Public via explicit `SHERPA_STAGE_2_PUBLIC_MAINNET=true` rollout |

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

| Document                                                             | Description                                       |
| -------------------------------------------------------------------- | ------------------------------------------------- |
| [Audit Firm Selection](docs/sherpa/audit/01_audit_firm_selection.md) | Code4rena vs Spearbit vs Trail of Bits comparison |
| [Audit Scope](docs/sherpa/audit/02_audit_scope_document.md)          | Contracts and functions in scope                  |
| [Threat Model](docs/sherpa/audit/03_threat_model.md)                 | Security threat analysis                          |
| [Known Issues](docs/sherpa/audit/04_known_issues.md)                 | Static analysis findings and accepted risks       |
| [Mainnet Deployment](docs/sherpa/audit/05_mainnet_deployment.md)     | Step-by-step deployment guide                     |
| [Safe Multisig Setup](docs/sherpa/audit/06_safe_multisig_setup.md)   | 2-of-3 Safe configuration                         |
| [Smoke Testing](docs/sherpa/audit/07_smoke_testing.md)               | Post-deployment verification                      |
| [Internal Beta](docs/sherpa/audit/08_internal_beta.md)               | Beta user onboarding and feedback                 |

### Press & Launch

| Document                                                      | Description                             |
| ------------------------------------------------------------- | --------------------------------------- |
| [Press Kit](docs/sherpa/press/README.md)                      | Project description, screenshots, links |
| [Elevator Pitch](docs/sherpa/press/ELEVATOR_PITCH.md)         | 30-second pitch                         |
| [Technical Overview](docs/sherpa/press/TECHNICAL_OVERVIEW.md) | Architecture for technical audience     |
| [Announcement](docs/sherpa/launch/ANNOUNCEMENT.md)            | Launch announcement draft               |
| [Changelog](docs/sherpa/launch/CHANGELOG.md)                  | What's new in this release              |
| [Migration Guide](docs/sherpa/launch/MIGRATION_GUIDE.md)      | For existing users                      |
| [Stage Status](docs/sherpa/STAGE_STATUS.md)                   | Status of each development stage        |

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
└── scripts/db/       Database migrations
```

## License

MIT. See `LICENSE`.
