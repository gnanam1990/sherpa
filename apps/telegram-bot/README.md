# Sherpa Telegram Bot

Telegram bot for Sherpa onchain agent.

The bot is a separate long-polling service. It needs a real BotFather token and a private-beta admin allowlist before it can run.

## Setup

```bash
cd ~/dev/serpha/sherpa
pnpm install
cp apps/telegram-bot/.env.example apps/telegram-bot/.env
# Edit .env with TELEGRAM_BOT_TOKEN and ADMIN_TG_USER_IDS
pnpm --filter @sherpa/telegram-bot dev
```

Create the token in Telegram:

1. Open `@BotFather`
2. Send `/newbot`
3. Choose the bot name and username
4. Copy the token into `TELEGRAM_BOT_TOKEN`

Get your numeric Telegram user ID:

1. Open `@userinfobot` or `@RawDataBot`
2. Copy your numeric `id`
3. Put it in `ADMIN_TG_USER_IDS`

## Commands

- `/start` — Welcome message
- `/send <amount> <asset> to <recipient>` — Send crypto
- `/balance` — Check linked wallet balance
- `/history` — Recent transactions
- `/positions` — Read-only Aave V3 positions on Base
- `/link` — Link your Smart Wallet
- `/unlink` — Disconnect your wallet

## Natural Language

Type plain English:

- "send 0.1 ETH to vitalik.base.eth"
- "swap 100 USDC for ETH"
- "check my balance"

## Environment Variables

Required:

- `TELEGRAM_BOT_TOKEN` — token from `@BotFather`
- `SHERPA_API_BASE` — production API, currently `https://sherpaapi-production.up.railway.app`
- `SHERPA_WEB_BASE` — production web, currently `https://sherpa-web.vercel.app`
- `ADMIN_TG_USER_IDS` — comma-separated numeric Telegram IDs allowed during beta

Optional:

- `SHERPA_STAGE_2_TESTNET_ENABLED=true` — lets the bot surface Stage 2 testnet write demos. Keep false for normal production.

## Deployment

Deploy as a dedicated Railway service, separate from `@sherpa/api`.

1. Railway dashboard → Sherpa project → New Service → GitHub Repo
2. Select this repo
3. Service settings → Deploy → Config file path: `/apps/telegram-bot/railway.json`
4. Keep the service root at the repository root. The bot Dockerfile needs workspace packages.
5. Set the environment variables above
6. Deploy
7. DM the bot in Telegram and test `/start`, `/link`, `/positions`, `/balance`, `/history`

Linking and signing require the API surface routes to have real database backing (`SHERPA_USE_REAL_DB=true` on the API service). If `/link` fails, check the API service database env first.

See `docs/sherpa/STAGE_3_DEPLOY.md` for the broader Stage 3 deployment guide.
