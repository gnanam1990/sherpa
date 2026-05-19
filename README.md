# Sherpa

<p align="center">
  <img src="apps/web/public/sherpa-horizontal-logo.png" alt="Sherpa" width="360" />
</p>

<p align="center">
  <strong>Natural-language DeFi agent for Base.</strong>
</p>

<p align="center">
  <a href="https://sherpa-web.vercel.app"><img src="https://img.shields.io/badge/web-live-0052FF" alt="Sherpa web app" /></a>
  <a href="https://sherpa-miniapp.vercel.app"><img src="https://img.shields.io/badge/mini%20app-live-0052FF" alt="Sherpa Mini App" /></a>
  <a href="https://basescan.org/address/0x00bfef87DD352D48F8572BcfA52E57870B35DE8b"><img src="https://img.shields.io/badge/contracts-verified-00D395" alt="Verified contracts" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-00D395" alt="Apache 2.0 license" /></a>
</p>

<p align="center">
  <a href="https://sherpa-miniapp.vercel.app">Mini App</a>
  ·
  <a href="https://sherpa-web.vercel.app">Web</a>
  ·
  <a href="https://basescan.org/address/0x00bfef87DD352D48F8572BcfA52E57870B35DE8b">SherpaRouter</a>
  ·
  <a href="https://farcaster.xyz/gnanam.eth">Farcaster</a>
</p>

## What Is Sherpa?

Sherpa lets people use DeFi by typing plain English.

Example:

```text
supply 100 USDC to Aave
```

Behind the scenes, Sherpa parses the intent, resolves tokens and addresses,
runs deterministic safety checks, shows a confirmation card, then routes the
approved transaction through independently reviewed Base mainnet contracts.

Sherpa is not an autonomous black box. If a flow is read-only, gated, or
unsupported, the product says so before any wallet prompt appears.

## Why Sherpa?

- **Independently reviewed:** 2 security reviews by anandh8x and
  vasanthdev2004, 0 critical findings after remediation.
- **Honest:** Real data, explicit empty states, no fake TVL or scripted success.
- **Base-native execution:** Write transactions execute on Base mainnet only.
- **Multi-chain visibility:** Ethereum, Polygon, Optimism, Arbitrum, and Base
  balances are visible read-only.
- **Solo built, open source:** Maintained by gnanam under Apache 2.0.
- **Safety first:** 7-ring preflight pipeline before confirmation.

## Live On Base Mainnet

| Contract       | Address                                      | Explorer                                                                            |
| -------------- | -------------------------------------------- | ----------------------------------------------------------------------------------- |
| SherpaRouter   | `0x00bfef87DD352D48F8572BcfA52E57870B35DE8b` | [Basescan](https://basescan.org/address/0x00bfef87DD352D48F8572BcfA52E57870B35DE8b) |
| SherpaTreasury | `0xF4e72beAA559E1815f4671e39EDb1295aD975918` | [Basescan](https://basescan.org/address/0xF4e72beAA559E1815f4671e39EDb1295aD975918) |

Mainnet ownership is Safe-controlled. Deployment records live in
[`deployments/base-mainnet.json`](deployments/base-mainnet.json), and security
review materials live in
[`docs/sherpa/audit/stage-2/`](docs/sherpa/audit/stage-2/).

## What You Can Do Today

| Capability               | Status | Scope                                                                             |
| ------------------------ | ------ | --------------------------------------------------------------------------------- |
| Supply to Aave V3        | Live   | Base mainnet guarded transaction                                                  |
| Borrow from Aave V3      | Live   | Base mainnet guarded transaction                                                  |
| Repay Aave debt          | Live   | Base mainnet guarded transaction                                                  |
| Withdraw Aave collateral | Live   | Base mainnet guarded transaction                                                  |
| Swap via Aerodrome       | Live   | Base mainnet guarded transaction                                                  |
| Alerts                   | Live   | Price, balance, and health-factor notifications                                   |
| DCA scheduler            | Live   | Schedule creation and worker checks; unattended signing remains session-key gated |
| Auto-repay               | Live   | Rule creation and worker checks; unattended signing remains session-key gated     |
| Multi-chain portfolio    | Live   | Read-only balances across Base, Ethereum, Polygon, Optimism, and Arbitrum         |

Sherpa transactions execute on Base mainnet only. Non-Base chains are display
surfaces, not transaction surfaces.

## What's Coming

- **Session keys:** waiting on broader Coinbase Smart Wallet general availability
  before unattended signing is exposed as a default user flow.
- **Morpho Blue:** scaffolded for Stage 2 preparation, not wired into production
  execution.
- **More chain transactions:** review-gated; current non-Base support is
  read-only.
- **Bridge:** disabled until adapters and routes are reviewed or audited.

## How It Works

```text
User intent
  -> Parser
  -> Safety pipeline (7 rings)
  -> Human-readable confirmation
  -> Wallet signature
  -> Reviewed SherpaRouter
  -> Onchain execution
```

1. **Parser:** turns natural language into a structured intent.
2. **Safety pipeline:** checks chain support, allowlists, balances, slippage,
   health factor, route shape, and execution boundaries.
3. **Confirmation:** shows exactly what will happen before signing.
4. **Router:** executes approved Base mainnet DeFi actions through verified
   contracts.
5. **Audit log:** records operational events for debugging and accountability.

## Stack

- Next.js 16 / React 19
- Viem 2 / Wagmi 2 / RainbowKit
- Tailwind CSS / Glass Aurora design system
- Foundry / Solidity
- Fastify / Redis-compatible worker patterns
- pnpm / Turborepo
- Farcaster Mini App / Base App metadata
- Telegram bot surface

## Test Coverage

Current verification snapshot:

- 2,200 tests passing across the workspace.
- SherpaRouter: 96.94% line coverage.
- SherpaTreasury: 100% line coverage.
- Slither: 0 high / 0 critical findings.
- 2 independent security reviews completed with 0 critical findings after
  remediation.

Run the same checks locally:

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

## Try It

| Surface   | Link                                                           |
| --------- | -------------------------------------------------------------- |
| Web app   | [sherpa-web.vercel.app](https://sherpa-web.vercel.app)         |
| Mini App  | [sherpa-miniapp.vercel.app](https://sherpa-miniapp.vercel.app) |
| Farcaster | [gnanam.eth](https://farcaster.xyz/gnanam.eth)                 |
| Base App  | `app_id 6a06efd3067444793fb8ddba`                              |

Mini App verification:

- Farcaster FID: `976779`
- Base App app_id: `6a06efd3067444793fb8ddba`

## Development

### Prerequisites

- Node.js 20 or newer
- pnpm 9.x
- Foundry, for contract builds and tests

### Setup

```bash
git clone https://github.com/gnanam1990/sherpa.git
cd sherpa
pnpm install
```

Copy only the env files needed for the surface you are running:

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env.local
```

Never commit private keys, bot tokens, API secrets, wallet mnemonics, or
deployment env files.

### Run Locally

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

## Architecture

```text
sherpa/
├── apps/
│   ├── web/            Next.js web app
│   ├── api/            Fastify API
│   ├── worker/         Automation and notification worker
│   ├── miniapp/        Farcaster/Base Mini App
│   └── telegram-bot/   Telegram command surface
├── packages/
│   ├── contracts/      Solidity contracts, tests, deployment scripts
│   ├── core/           Parser, intent types, execution models
│   ├── tools/          Protocol adapters and transaction builders
│   ├── safety/         Safety rings and preflight checks
│   ├── memory/         Audit log, rules, notifications, durable stores
│   ├── scheduler/      Alert, DCA, auto-repay runners
│   ├── identity/       ENS, Basenames, Farcaster resolution
│   ├── config/         Environment schema and runtime config
│   ├── logger/         Structured logging and Sentry integration
│   ├── ui/             Shared UI primitives
│   └── sdk/            Developer SDK surface
├── scripts/db/         Database migrations
├── deployments/        Public deployment artifacts
└── docs/sherpa/        Product, audit, launch, and decision records
```

## License

Sherpa is licensed under the Apache License, Version 2.0. See
[`LICENSE`](LICENSE).

The "Sherpa" name and project identity are maintained by gnanam. See
[`NOTICE`](NOTICE).

## Maintainer

- GitHub: [@gnanam1990](https://github.com/gnanam1990)
- Farcaster: [gnanam.eth](https://farcaster.xyz/gnanam.eth)
- X: [@0x_art](https://x.com/0x_art)
- Location: Ooty, Tamil Nadu, India

## Security

Do not open public issues for vulnerabilities. Follow
[`SECURITY.md`](SECURITY.md).
