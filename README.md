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

| Stage        | Description                                             | Status                                                                                 |
| ------------ | ------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Stage 1**  | SEND, BALANCE, HISTORY, IDENTITY_LOOKUP on Base Sepolia | Live public smoke                                                                      |
| **Stage 2**  | DeFi (SWAP, LEND, BORROW, STAKE, BRIDGE, LP)            | Code present, gated behind config and audit                                            |
| **Stage 3**  | Multi-surface (Farcaster Mini App, Telegram bot)        | Code complete, deployment gated by Mini App account association and Telegram bot token |
| **Stage 4**  | Automation (DCA, ALERT, AUTO_REPAY)                     | Scheduler code present, not running in production                                      |
| **Stage 5+** | Multi-chain, Session Keys, Strategy, etc.               | Planned/scaffolded                                                                     |

**Stage 1 web is live on Base Sepolia.** Future stages are intentionally gated behind production config, audits, or separate deployments for safety.

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

## Deployment

See `docs/sherpa/DEPLOYMENT_CHECKLIST.md`.

## Security

See `docs/sherpa/AUDIT_PREPARATION.md` and `docs/sherpa/THREAT_MODEL.md`.

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
