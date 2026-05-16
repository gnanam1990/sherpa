# Sherpa Press Kit

## Project Description

**Sherpa** is a natural-language DeFi agent on Base L2. Users type plain English commands like "send 5 USDC to vitalik.base.eth" or "swap 1 ETH for USDC" and Sherpa executes the onchain transaction automatically.

Sherpa eliminates the complexity of DeFi by letting users express their intent in natural language. No wallet popups, no gas management, no protocol selection — just type what you want and Sherpa handles the rest.

## Key Features

- **Natural Language Interface**: Type commands in plain English
- **Sponsored Gas**: Coinbase Smart Wallet pays gas fees
- **Safety First**: 7 safety rings protect every transaction
- **DeFi Composability**: Swap, lend, borrow, stake, bridge, LP
- **Multi-Platform**: Web app, Farcaster Mini App, Telegram bot

## How It Works

```
User types: "swap 10 USDC for ETH"
    ↓
Sherpa parses intent
    ↓
Safety rings validate (7 checks)
    ↓
Tenderly simulates transaction
    ↓
User confirms
    ↓
Transaction executes on Base
    ↓
User receives ETH
```

## Screenshots

> `<to be added: web app screenshots>`

## Technical Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   User      │────▶│  Sherpa API  │────▶│   Base L2   │
│  (Web/App)  │     │  (Parser +   │     │  (Onchain)  │
│             │◀────│   Executor)  │◀────│             │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │ Safety Rings │
                    │ (7 checks)  │
                    └─────────────┘
```

## Links

| Resource | URL |
|---|---|
| Web App | https://sherpa-web.vercel.app |
| GitHub | `<repo-url>` |
| Documentation | `<docs-url>` |
| Farcaster | `<farcaster-url>` |
| Telegram | `<telegram-url>` |

## Stats

| Metric | Value |
|---|---|
| Chain | Base (L2) |
| Smart Contracts | SherpaRouter, SherpaTreasury |
| Supported Tokens | USDC, WETH, DAI + more |
| Protocols Integrated | Aerodrome, Aave V3 |
| Safety Rings | 7 |
| Test Coverage | 500+ tests |

## Team

`<to be filled>`

## Brand Assets

- Logo: `apps/web/public/sherpa-horizontal-logo.png`
- Colors: `<primary-color>`, `<secondary-color>`
- Font: `<font-name>`

## Press Contact

`<to be filled>`
