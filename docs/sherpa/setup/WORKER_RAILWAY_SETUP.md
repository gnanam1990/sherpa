# Sherpa Worker on Railway

The worker runs Stage 4 automation loops:

- Alerts: evaluates active alerts and dispatches notifications. Telegram
  delivery is verified in production when an alert stores `telegramChatId` in
  `params`. Farcaster delivery is wired when an alert stores `farcasterFid`
  in `params` and the Mini App webhook has stored an active notification token
  for that FID.
- DCA: checks due schedules and records fail-closed execution attempts until the session-key executor is configured.
- Auto-repay: checks Aave health factors and records fail-closed execution attempts until the repay executor and broadcaster are configured.

## Deploy

Create a separate Railway service from the same GitHub repo and point it at:

```text
apps/worker/railway.json
```

The service builds with `apps/worker/Dockerfile` and starts:

```bash
pnpm --filter @sherpa/worker start
```

## Required Variables

Use the same production database settings as `@sherpa/api`:

```bash
SHERPA_USE_REAL_DB=true
DATABASE_URL=<supabase transaction pooler url>
SHERPA_CHAIN=base-mainnet
BASE_MAINNET_RPC_URL=<base mainnet rpc>
BASE_RPC_URL=<base mainnet rpc>
BASESCAN_API_KEY=<basescan key>
TELEGRAM_BOT_TOKEN=<telegram bot token, if telegram alerts are enabled>
ADMIN_TG_USER_IDS=<comma-separated admin telegram ids, optional>
FARCASTER_NOTIFICATION_TARGET_URL=https://sherpa-miniapp.vercel.app
```

Worker loop toggles:

```bash
WORKER_ALERTS_ENABLED=true
WORKER_DCA_ENABLED=true
WORKER_AUTO_REPAY_ENABLED=true
ALERT_INTERVAL_MS=60000
DCA_INTERVAL_MS=60000
AUTO_REPAY_INTERVAL_MS=60000
```

## Safety

DCA and auto-repay do not fabricate transaction hashes. If no session-key
executor or broadcaster is configured, execution is logged as failed with a
clear `*_not_configured` reason. This is intentional until Stage 7 automation
signing is configured.

## Health

Railway health endpoint:

```text
/health
```

It returns active alert count, due DCA schedule count, active auto-repay rule
count, uptime, and whether the worker is using `postgres` or `process-memory`
persistence.

Production:

```text
https://sherpa-worker-production.up.railway.app/health
```

Telegram smoke verification:

```text
Bot API getMe resolves to @sherpaonbasebot, and a direct smoke message to the
configured admin chat ID succeeded on 2026-05-17.
```

Farcaster delivery boundary:

```text
The worker resolves active Farcaster notification tokens from Postgres by FID
and posts to the stored client notification URL. Live smoke requires a user to
add the Mini App and enable notifications so the webhook can store a token.
```
