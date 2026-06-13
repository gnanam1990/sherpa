# Sherpa

> Natural-language DeFi agent for Base: type plain English, get safety-checked, on-chain execution through reviewed contracts.

[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
![Language: TypeScript & Solidity](https://img.shields.io/badge/built%20with-TypeScript%20%26%20Solidity-555.svg)
[![CI](https://github.com/gnanam1990/sherpa/actions/workflows/ci.yml/badge.svg)](https://github.com/gnanam1990/sherpa/actions/workflows/ci.yml)

## Overview

Sherpa turns natural-language requests (for example, `supply 100 USDC to Aave`)
into structured DeFi intents, runs them through a deterministic safety pipeline,
shows a human-readable confirmation, and routes the approved transaction through
its own reviewed contracts on Base mainnet. It is built for users who want to
interact with on-chain protocols without writing transactions by hand, while
keeping every action explicit and gated rather than autonomous.

The repository is a pnpm + Turborepo monorepo combining immutable, Safe-owned
Solidity contracts (built and tested with Foundry) and a set of TypeScript
packages and apps that handle intent parsing, safety checks, protocol adapters,
identity resolution, scheduling, and the web / mini-app / API / worker surfaces.

## Features

- Natural-language intent parsing into structured, typed DeFi operations.
- A layered safety pipeline (rings 1–7) covering chain support, token allowlists,
  balances, slippage and deadline validation, health-factor checks, and amount
  caps before any wallet prompt.
- On-chain execution via the reviewed `SherpaRouter` contract, integrating
  Aerodrome (swaps) and Aave V3 (supply / borrow / repay / withdraw) on Base.
- A `SherpaTreasury` contract for protocol fee custody, owned by a Safe.
- Read-only multi-chain portfolio visibility (Base, Ethereum, Polygon, Optimism,
  Arbitrum) — non-Base chains are display surfaces, not transaction surfaces.
- Scheduling primitives for alerts, DCA, and auto-repay (rule/schedule creation
  and worker evaluation). Unattended on-chain signing is gated and ships with
  safe no-op executors by default (see Status).
- Pluggable LLM router with provider fallback and cost tracking.
- Multiple surfaces: Next.js web app, Farcaster / Base Mini App, Fastify API,
  background worker, and a Telegram bot.

## Tech stack

- **Contracts:** Solidity 0.8.24, Foundry (forge), OpenZeppelin (Ownable,
  Pausable, ReentrancyGuard, SafeERC20).
- **Chain tooling:** viem, wagmi, RainbowKit; Aave V3 and Aerodrome integrations.
- **Web / UI:** Next.js, React, Tailwind CSS, shared `@sherpa/ui` components.
- **Backend / workers:** Fastify, pino, Sentry, Zod-validated config.
- **Monorepo:** pnpm workspaces, Turborepo, TypeScript, Vitest, ESLint, Prettier.

## Architecture

The monorepo is split into deployable apps and shared packages.

**Apps (`apps/*`)**

- `web` — Next.js web app and primary UI.
- `miniapp` — Farcaster / Base Mini App surface.
- `api` — Fastify REST API.
- `worker` — background daemon for alert evaluation, DCA, and auto-repay loops.
- `telegram-bot` — Telegram command surface.

**Packages (`packages/*`)**

- `contracts` — Solidity contracts, Foundry tests, and deployment scripts.
- `core` — agent core: parser, planner, and executor.
- `tools` — protocol adapters (quote / build-tx / verify) and data indexers.
- `safety` — safety rings 1–7, allowlists, and amount caps.
- `memory` — user prefs, history snapshots, and the audit-log wrapper.
- `scheduler` — DCA, alerts, and monitor runners.
- `identity` — address resolution (Farcaster, Basenames, ENS, direct).
- `config` — single-source environment validation and chain configs.
- `llm` — LLM provider router and cost tracking.
- `agentkit` — Coinbase AgentKit fallback adapter.
- `sdk` — TypeScript client for the Sherpa API.
- `ui` — shared React components and design tokens.
- `logger` — shared structured logger.

Supporting directories: `deployments/` (public deployment artifacts),
`scripts/db/` (database migrations), and `docs/sherpa/` (product, audit, and
decision records).

### On-chain contracts (Base mainnet)

| Contract       | Address                                      |
| -------------- | -------------------------------------------- |
| SherpaRouter   | `0x00bfef87DD352D48F8572BcfA52E57870B35DE8b` |
| SherpaTreasury | `0xF4e72beAA559E1815f4671e39EDb1295aD975918` |

`FeeCalculator` and `SafetyCheck` are internal Solidity libraries used by the
router. Both deployed contracts are verified on Basescan and owned by a Safe.
Full deployment records (mainnet and Base Sepolia) are in
[`deployments/`](deployments/).

## Getting started

### Prerequisites

- Node.js 20 or newer (repo pins Node 22 via `.nvmrc`).
- pnpm 9.x (the repo declares `pnpm@9.15.1`).
- [Foundry](https://book.getfoundry.sh/) for building and testing the contracts.

### Installation

```bash
git clone https://github.com/gnanam1990/sherpa.git
cd sherpa
pnpm install
```

### Configuration

Sherpa reads all environment variables through `packages/config` (`loadConfig()`).
Copy the template and fill in only what the surface you run requires:

```bash
cp .env.example .env
```

Key variables (see [`.env.example`](.env.example) for the full, commented list):

| Variable | Purpose |
| --- | --- |
| `SHERPA_CHAIN` | Target chain (`base-sepolia` default, or `base-mainnet`). |
| `SHERPA_RPC_URL` | Optional RPC override for the selected chain. |
| `SHERPA_USE_REAL_RPC` | Enable real RPC reads (`false` for offline/unit tests). |
| `SHERPA_PAYMASTER_URL` | Optional paymaster service URL for gas sponsorship. |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GROQ_API_KEY` | LLM provider API keys; at least one enables the LLM router (with fallback). |
| `BASESCAN_API_KEY` | Basescan key for the history indexer. |
| `HOST`, `PORT`, `SHERPA_API_BASE` | API bind config and web → API proxy base. |
| `SHERPA_USE_REAL_DB`, `DATABASE_URL`, `SUPABASE_SERVICE_KEY` | Postgres-backed memory stores (default in-memory). |
| `NEYNAR_API_KEY`, `NEYNAR_BASE_URL`, `ALCHEMY_ETH_MAINNET_RPC` | Identity resolvers (Farcaster, ENS). |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Optional KV cache layer. |
| `ADMIN_API_KEY`, `CRON_SECRET` | Bearer tokens for admin and cron endpoints. |
| `SENTRY_DSN`, `SENTRY_ENVIRONMENT` | Error reporting (no-op when unset). |
| `WORKER_ALERTS_ENABLED`, `WORKER_DCA_ENABLED`, `WORKER_AUTO_REPAY_ENABLED`, `*_INTERVAL_MS` | Worker loop toggles and intervals. |
| `RESEND_API_KEY`, `POSTMARK_API_KEY`, `EMAIL_FROM_ADDRESS`, `WEB_PUSH_VAPID_*` | Notification delivery. |
| `DCA_EXECUTION_ENABLED`, `AUTO_REPAY_EXECUTION_ENABLED` | Unattended execution gates (default `false`). |
| `NEXT_PUBLIC_GLASS_AURORA` | Web design-system rollout flag. |

Never commit private keys, bot tokens, API secrets, mnemonics, or `.env` files.

### Building and running

Workspace-wide tasks (run from the repo root via Turborepo):

```bash
pnpm build       # turbo run build
pnpm dev         # turbo run dev
pnpm typecheck   # turbo run typecheck
pnpm lint        # turbo run lint
```

Run individual surfaces:

```bash
pnpm --filter @sherpa/api dev
pnpm --filter @sherpa/web dev
pnpm --filter @sherpa/worker dev
pnpm --filter @sherpa/telegram-bot dev
```

Build and test the contracts:

```bash
cd packages/contracts
forge build
forge test -vv
```

## Testing

```bash
pnpm test        # turbo run test across the workspace (Vitest)
```

Contracts are tested with Foundry. The `packages/contracts` suite covers the
router and treasury, the `FeeCalculator` and `SafetyCheck` libraries, and
treasury invariants:

```bash
cd packages/contracts
forge test -vv                          # unit + integration tests
pnpm --filter @sherpa/contracts test:fuzz       # fuzz runs
pnpm --filter @sherpa/contracts test:invariant  # invariant tests
pnpm --filter @sherpa/contracts coverage        # lcov coverage report
```

CI (`.github/workflows/ci.yml`) runs lint, typecheck, build, and tests; separate
workflows run Slither (`slither.yml`) and Lighthouse (`lighthouse.yml`).

## Status

Sherpa is partially live and partially in active development:

- **Live / immutable:** `SherpaRouter` and `SherpaTreasury` are deployed and
  verified on Base mainnet and owned by a Safe. They back the supported Aave V3
  and Aerodrome flows. Contracts are also deployed on Base Sepolia for testing.
- **Default chain:** the off-chain stack defaults to `base-sepolia`; mainnet
  execution requires `SHERPA_CHAIN=base-mainnet`.
- **Stage-2 / scaffolded:** several off-chain capabilities are in progress. The
  scheduler's unattended on-chain signing ships with safe no-op executors and is
  gated behind `DCA_EXECUTION_ENABLED` / `AUTO_REPAY_EXECUTION_ENABLED`
  (default `false`); Postgres-backed memory is opt-in (`SHERPA_USE_REAL_DB`);
  and additional protocol adapters and chains are review-gated and not wired into
  production execution.

Transactions execute on Base only. Non-Base chains are read-only display
surfaces.

## License

Licensed under the Apache License, Version 2.0 — see [`LICENSE`](LICENSE) and
[`NOTICE`](NOTICE). Report security issues privately per [`SECURITY.md`](SECURITY.md);
do not open public issues for vulnerabilities.
</content>
