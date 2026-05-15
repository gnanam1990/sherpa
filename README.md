# Sherpa

**Type what you want. Sherpa does the onchain.**

Sherpa is a natural-language operating system for the Base L2 blockchain. Users type intent in English; Sherpa parses, validates, simulates, and executes onchain transactions via Coinbase Smart Wallet with sponsored gas.

## Status

| Stage | Description | Status |
|-------|-------------|--------|
| **Stage 1** | SEND, BALANCE, HISTORY on Base Sepolia | ✅ Live |
| **Stage 2** | DeFi (SWAP, LEND, BORROW, STAKE, BRIDGE, LP) | Code complete |
| **Stage 3** | Multi-surface (Farcaster, Telegram, BET) | Code complete |
| **Stage 4** | Automation (DCA, ALERT, AUTO_REPAY) | Code complete |
| **Stage 5+** | Multi-chain, Session Keys, Strategy, etc. | Code complete |

**Stage 1 is live on Base Sepolia.** Future stages are coded and gated behind production config for safety.

## Stage 1 — Live

| Intent | Example |
|--------|---------|
| SEND | `send 0.1 ETH to vitalik.base.eth` |
| BALANCE | `what's my balance` |
| HISTORY | `show my recent transactions` |
| IDENTITY_LOOKUP | `who is vitalik.base.eth` |

## Quick Start

```bash
# Install
pnpm install

# Typecheck
pnpm typecheck

# Test (713 tests)
pnpm --filter @sherpa/core test
pnpm --filter @sherpa/tools test
pnpm --filter @sherpa/safety test

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
│   ├── identity/     Farcaster + ENS
│   ├── logger/       Structured logging
│   └── ui/           Shared components
└── scripts/db/       14 migrations
```

## License
MIT
