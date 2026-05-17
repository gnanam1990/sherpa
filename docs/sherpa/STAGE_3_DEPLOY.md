# Stage 3 Deploy Guide

## A. Pre-deploy checklist

- [ ] CDP Client API Key obtained from [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com)
- [ ] Vercel CLI installed (`npm i -g vercel`)
- [ ] GitHub repo accessible to Vercel
- [ ] Farcaster custody wallet (with recovery phrase) for signing manifest
- [ ] Telegram bot token from @BotFather

## B. Deploy apps/miniapp to Vercel

Use a Vercel Git project, not a one-off `vercel --cwd apps/miniapp` upload. The app depends on workspace packages, so uploading only `apps/miniapp` makes Vercel run `npm install` against `workspace:*` dependencies and fail.

Recommended Vercel project settings:

```text
Project name: sherpa-miniapp
Git repository: gnanam1990/sherpa
Root Directory: apps/miniapp
Framework Preset: Next.js
Install Command: cd ../.. && pnpm install --frozen-lockfile
Build Command: pnpm build
Output Directory: .next
```

Set environment variables on that Vercel project:

```text
NEXT_PUBLIC_URL=https://sherpa-miniapp.vercel.app
SHERPA_API_BASE=<apps/api URL, used by /.well-known/farcaster.json and /api/* rewrites>
NEXT_PUBLIC_ONCHAINKIT_API_KEY=<your CDP Client API Key, cdp_pk_...>
NEXT_PUBLIC_SHERPA_CHAIN=base-sepolia
NEXT_PUBLIC_BASE_APP_ID=<Base Dashboard app id>
```

Do not set `NEXT_PUBLIC_SHERPA_API_BASE` for production unless the API host has browser CORS enabled. The Mini App should call same-origin `/api/*`, and `next.config.ts` rewrites those requests to `SHERPA_API_BASE`.

Then deploy from Vercel's Git integration by pushing `main`, or click **Redeploy** in the Vercel dashboard after the env vars are saved.

## C. Generate Account Association

1. Visit [base.dev/preview](https://base.dev/preview) (same browser where Farcaster custody wallet is connected)
2. Paste the apps/miniapp URL in "App URL"
3. Click "Submit"
4. Click "Verify" button
5. Follow prompts to sign with custody wallet
6. Copy header, payload, signature values

## D. Set Account Association env vars

```bash
vercel env add FARCASTER_HEADER production --cwd apps/miniapp
vercel env add FARCASTER_PAYLOAD production --cwd apps/miniapp
vercel env add FARCASTER_SIGNATURE production --cwd apps/miniapp

# Redeploy with signed manifest
vercel --prod --cwd apps/miniapp
```

## E. Verify in preview tools

1. [base.dev/preview](https://base.dev/preview) → enter URL → check "Account Association" tab
2. [base.dev/preview](https://base.dev/preview) → "Metadata" tab → verify all fields
3. [farcaster.xyz/~/developers/mini-apps/preview](https://farcaster.xyz/~/developers/mini-apps/preview) → enter URL → verify renders

## F. Test in Warpcast

1. Cast the URL in Warpcast (your own timeline)
2. Tap the embed → mini app loads
3. Test SEND flow end-to-end

## G. Deploy apps/telegram-bot to Railway

```bash
# Create new Railway service
railway up --name sherpa-bot

# Set env vars in Railway dashboard:
# TELEGRAM_BOT_TOKEN (from @BotFather)
# SHERPA_API_BASE (https://sherpaapi-production.up.railway.app)
# SHERPA_WEB_BASE (https://sherpa-web.vercel.app)
# ADMIN_TG_USER_IDS (your TG user ID for beta)
# SHERPA_STAGE_2_TESTNET_ENABLED=false
```

Linking and signing require the API service to have real database backing
(`SHERPA_USE_REAL_DB=true` plus the surface-link migrations). If `/link`
returns an error, fix API database configuration before debugging the bot.

## H. Smoke test the bot

1. Open Telegram, DM your bot
2. `/start` → welcome message
3. `/link` → get deep-link → open in browser → sign → return to TG
4. "send 0.01 usdc to vitalik.eth" → confirmation card → sign link → web → tx → success
5. `/balance` → shows current balance
6. `/history` → shows the SEND tx

## I. Stage 1 verification

After all deploys, verify Stage 1 is still live:

```bash
curl -I https://sherpa-web.vercel.app/
# Expected: HTTP 200

pnpm --filter @sherpa/web build  # must still pass
pnpm --filter @sherpa/api build  # must still pass
```
