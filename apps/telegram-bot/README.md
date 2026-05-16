# Sherpa Telegram Bot

Telegram bot for Sherpa onchain agent.

## Setup

```bash
cd ~/dev/serpha/sherpa
pnpm install
cp apps/telegram-bot/.env.example apps/telegram-bot/.env
# Edit .env with your TELEGRAM_BOT_TOKEN
pnpm --filter @sherpa/telegram-bot dev
```

## Commands

- `/start` — Welcome message
- `/send <amount> <asset> to <recipient>` — Send crypto
- `/balance` — Check linked wallet balance
- `/history` — Recent transactions
- `/link` — Link your Smart Wallet

## Natural Language

Type plain English:

- "send 0.1 ETH to vitalik.base.eth"
- "swap 100 USDC for ETH"
- "check my balance"

## Environment Variables

See `.env.example` for required variables.

## Deployment

See `docs/sherpa/STAGE_3_DEPLOY.md` for Railway deployment guide.
