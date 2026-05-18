# Sherpa

<p align="center">
  <img src="apps/web/public/sherpa-horizontal-logo.png" alt="Sherpa" width="360" />
</p>

<p align="center">
  <strong>The natural-language agent for Base.</strong>
</p>

<p align="center">
  <a href="https://sherpa-web.vercel.app"><img src="https://img.shields.io/badge/web-live-0052FF" alt="Web app live" /></a>
  <a href="https://sherpa-miniapp.vercel.app"><img src="https://img.shields.io/badge/mini%20app-live-0052FF" alt="Mini App live" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-00D395" alt="MIT license" /></a>
  <img src="https://img.shields.io/badge/network-Base-0052FF" alt="Base" />
</p>

Sherpa turns plain-English intent into guarded onchain actions. A user types a request such as `send 5 usdc to vitalik.base.eth`, `show my positions`, or `swap 1 usdc for eth`; Sherpa parses the request, checks the safety boundary, and either presents a wallet confirmation card, returns read-only account data, or clearly explains why the flow is gated.

Sherpa is built as a production-facing monorepo: web app, API, automation worker, Farcaster/Base Mini App, Telegram bot, verified contracts, protocol adapters, safety rings, and durable audit/memory storage.

## Live Product

| Surface                 | URL                                                    | Status                                           |
| ----------------------- | ------------------------------------------------------ | ------------------------------------------------ |
| Web app                 | https://sherpa-web.vercel.app                          | Production                                       |
| API                     | https://sherpaapi-production.up.railway.app            | Production, used by web and bot surfaces         |
| Automation worker       | https://sherpa-worker-production.up.railway.app/health | Production health endpoint; beta execution loops |
| Farcaster/Base Mini App | https://sherpa-miniapp.vercel.app                      | Live app surface                                 |
| Farcaster profile       | https://farcaster.xyz/sherpaonbase                     | Live                                             |
| Telegram bot            | https://t.me/sherpaonbasebot                           | Live                                             |

## What Works Today

| Capability                    | Network                   | Current behavior                                                            |
| ----------------------------- | ------------------------- | --------------------------------------------------------------------------- |
| Send tokens                   | Base Sepolia              | Coinbase Smart Wallet flow with sponsored gas                               |
| Balance and history           | Base / Base Sepolia       | Read-only wallet views and transaction history                              |
| Identity lookup               | ENS, Basenames, Farcaster | Resolves supported names before confirmation                                |
| Aave positions                | Base mainnet              | Read-only Aave V3 health factor, collateral, debt, and borrowing power      |
| Swap                          | Base mainnet              | Builds guarded SherpaRouter confirmation cards                              |
| Lend, borrow, repay, withdraw | Base mainnet              | Builds guarded Aave confirmation cards through SherpaRouter                 |
| Alerts                        | Base mainnet data         | Beta setup and Telegram delivery; Farcaster token delivery is wired         |
| DCA and auto-repay            | Base mainnet data         | Beta setup and worker loops; autonomous execution remains session-key gated |
| Multi-chain and governance    | Multiple networks         | Read-only discovery surfaces                                                |

Sherpa does not silently execute unsupported actions. If a feature is read-only, beta, or gated, the UI says so before a wallet prompt appears.

## Deployment

| Network      | Contracts                                                                                                                                                                                          | Status                                                   |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Base Mainnet | [SherpaRouter](https://basescan.org/address/0x00bfef87DD352D48F8572BcfA52E57870B35DE8b), [SherpaTreasury](https://basescan.org/address/0xF4e72beAA559E1815f4671e39EDb1295aD975918)                 | Verified, Safe-owned, deployed 2026-05-17                |
| Base Sepolia | [SherpaRouter](https://sepolia.basescan.org/address/0x7CfdE6a4D1A85236419d4343a3A466d0677A0056), [SherpaTreasury](https://sepolia.basescan.org/address/0x70A58169BF96587E55F500c4b5cb9d956Ef826ee) | Verified testnet deployment for review and smoke testing |

Base Sepolia swap-path testing uses a verified mock Aerodrome router because Aerodrome does not provide an official Base Sepolia router. Deployment artifacts live in `deployments/base-sepolia.json` and the mainnet runbook is in [docs/sherpa/audit/05_mainnet_deployment.md](docs/sherpa/audit/05_mainnet_deployment.md).

## Safety And Review Posture

Sherpa's production write path is designed around explicit user confirmation and conservative contract boundaries.

- Verified contracts on Base mainnet and Base Sepolia.
- Safe-owned mainnet deployment.
- Two external review rounds completed; findings remediated before guarded mainnet rollout.
- Router uses allowlisted assets, slippage checks, deadline checks, health-factor guards, pausable emergency controls, and SafeERC20 patterns.
- API and worker paths preserve feature gates for beta and unattended execution flows.
- Full local verification on 2026-05-18: `pnpm -r typecheck`, `pnpm -r build`, and `pnpm -r test` passed with 2,162 tests.

Security policy: [SECURITY.md](SECURITY.md). Threat model: [docs/sherpa/THREAT_MODEL.md](docs/sherpa/THREAT_MODEL.md).

## Stage Status

| Stage   | Scope                                    | Status                                                                                |
| ------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| Stage 1 | Send, balance, history, identity lookup  | Live                                                                                  |
| Stage 2 | Positions and DeFi writes                | Live on Base mainnet with guarded confirmation cards                                  |
| Stage 3 | Farcaster/Base Mini App and Telegram bot | Live                                                                                  |
| Stage 4 | Alerts, DCA, auto-repay                  | Beta; worker and notification paths are live, unattended execution remains gated      |
| Stage 5 | Session keys, strategies, multi-chain    | Partial; metadata/read paths exist, signing UX and execution are still being hardened |
| Stage 6 | Portfolio, notifications, fee taker      | Partial                                                                               |
| Stage 7 | Governance and social flows              | Read-only / partial                                                                   |
| Stage 8 | Developer API, cross-chain, mobile depth | Planned / scaffolded                                                                  |
| Stage 9 | Risk and compliance expansion            | Planned / scaffolded                                                                  |

See [docs/sherpa/STAGE_STATUS.md](docs/sherpa/STAGE_STATUS.md) for the detailed stage matrix.

## Architecture

```text
sherpa/
├── apps/
│   ├── web/            Next.js 16 web app
│   ├── api/            Fastify API
│   ├── worker/         Automation and notification worker
│   ├── miniapp/        Farcaster/Base Mini App
│   └── telegram-bot/   Telegram command surface
├── packages/
│   ├── core/           Deterministic parser, intent types, execution models
│   ├── tools/          Protocol adapters and transaction builders
│   ├── safety/         Safety rings and preflight checks
│   ├── memory/         Audit log, rules, notifications, durable stores
│   ├── scheduler/      Alert, DCA, auto-repay runners
│   ├── identity/       ENS, Basenames, Farcaster resolution
│   ├── config/         Environment schema and runtime config
│   ├── logger/         Structured logging and Sentry integration
│   ├── ui/             Shared UI primitives
│   └── agentkit/       Planner and agent error models
├── packages/contracts/ Solidity contracts, tests, deployment scripts
├── scripts/db/         Database migrations
└── docs/sherpa/        Product, audit, launch, and decision records
```

## Design System

The active web design is **Glass Aurora**: a dark, glass-style interface inspired by Base's visual language and Sherpa's mountain identity. It remains controlled by `NEXT_PUBLIC_GLASS_AURORA` so environments can roll forward or back without changing contracts, routes, or API behavior.

Design reference: [docs/design/GLASS_AURORA.md](docs/design/GLASS_AURORA.md).

## Local Development

### Requirements

- Node.js 20 or newer
- pnpm 9.x
- Foundry, for contract builds and tests

### Install

```bash
pnpm install
```

### Run services

```bash
pnpm --filter @sherpa/api dev
pnpm --filter @sherpa/web dev
pnpm --filter @sherpa/worker dev
pnpm --filter @sherpa/telegram-bot dev
```

### Verify

```bash
pnpm -r typecheck
pnpm -r build
pnpm -r test
```

Contract-only verification:

```bash
cd packages/contracts
forge build
forge test -vv
```

## Environment

Start from the example files and only enable the stages you are actively testing.

- `apps/web/.env.example`
- `apps/api/.env.example`
- `apps/worker/.env.example`
- `apps/telegram-bot/.env.example`
- `packages/contracts/.env.example`

Important runtime flags include:

| Variable                        | Purpose                                  |
| ------------------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_GLASS_AURORA`      | Enables the Glass Aurora web UI          |
| `SHERPA_STAGE_2_ENABLED`        | Enables Stage 2 API route handling       |
| `SHERPA_STAGE_2_PUBLIC_MAINNET` | Allows public Base mainnet Stage 2 cards |
| `SHERPA_STAGE_2_BETA_WALLETS`   | Wallet allowlist for guarded rollouts    |
| `NEXT_PUBLIC_SHERPA_API_BASE`   | Web app API base URL                     |
| `TELEGRAM_BOT_TOKEN`            | Telegram bot runtime token               |

Never commit private keys, bot tokens, API secrets, or wallet mnemonics.

## Documentation

| Area              | Documents                                                                                                                                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stage status      | [Stage Status](docs/sherpa/STAGE_STATUS.md), [Deployment Checklist](docs/sherpa/DEPLOYMENT_CHECKLIST.md)                                                                                                                                    |
| API               | [API Documentation](docs/sherpa/API.md), [API Reference](docs/api/REFERENCE.md)                                                                                                                                                             |
| Audit and launch  | [Audit Scope](docs/sherpa/audit/02_audit_scope_document.md), [Threat Model](docs/sherpa/audit/03_threat_model.md), [Mainnet Deployment](docs/sherpa/audit/05_mainnet_deployment.md), [Smoke Testing](docs/sherpa/audit/07_smoke_testing.md) |
| Product and press | [Press Kit](docs/sherpa/press/README.md), [Technical Overview](docs/sherpa/press/TECHNICAL_OVERVIEW.md), [Launch Changelog](docs/sherpa/launch/CHANGELOG.md)                                                                                |
| Decisions         | [docs/sherpa/decisions/](docs/sherpa/decisions/)                                                                                                                                                                                            |
| Devlogs           | [docs/sherpa/devlog/](docs/sherpa/devlog/)                                                                                                                                                                                                  |

## Token Disclaimer

Sherpa does not have an official token. Any SHERPA token claiming affiliation with this project is not official.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request, and keep changes scoped, tested, and documented.

## License

MIT. See [LICENSE](LICENSE).
