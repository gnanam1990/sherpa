# Sherpa

**Type what you want. Sherpa does the onchain.**

Sherpa is a natural-language operating system for the Base L2 blockchain. Users type intent in English; Sherpa parses, validates, simulates, and executes onchain transactions via Coinbase Smart Wallet with sponsored gas.

## Features

### 38 Intents
| Category | Intents |
|----------|---------|
| **DeFi** | SWAP, LEND, BORROW, STAKE, BRIDGE, LP |
| **Payments** | SEND, TIP |
| **Information** | BALANCE, HISTORY, IDENTITY_LOOKUP, PORTFOLIO, ANALYTICS |
| **Markets** | BET, COLLECT |
| **Automation** | DCA, ALERT, AUTO_REPAY, TIME_LOCK, AUTO_REBALANCE |
| **Social** | POLL, SOCIAL, GOVERNANCE |
| **Advanced** | SESSION_KEY, STRATEGY, COMPOSABLE, RISK, AUTOMATION |
| **Platform** | SECURITY, DEVELOPER, AI_AGENT, NOTIFICATION |

### 6 Chains Supported
- Base (primary)
- Ethereum
- Arbitrum
- Optimism
- Polygon
- Avalanche

### Architecture
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

## Quick Start

```bash
# Install
pnpm install

# Typecheck
pnpm typecheck

# Test
pnpm --filter @sherpa/core test
pnpm --filter @sherpa/tools test

# Lint
pnpm lint

# Dev
pnpm --filter @sherpa/api dev
pnpm --filter @sherpa/web dev
```

## Environment Variables

See `apps/api/.env.example` and `apps/web/.env.example`.

## Testing

```bash
# Run all tests
pnpm --filter @sherpa/core test
pnpm --filter @sherpa/tools test
pnpm --filter @sherpa/agentkit test
pnpm --filter @sherpa/safety test
pnpm --filter @sherpa/config test
pnpm --filter @sherpa/scheduler test
```

**500+ tests** across all packages.

## Deployment

See `docs/sherpa/DEPLOYMENT_CHECKLIST.md`.

## Security

See `docs/sherpa/AUDIT_PREPARATION.md` and `docs/sherpa/THREAT_MODEL.md`.

## License
MIT
