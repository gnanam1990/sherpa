# Stage 3 Deploy Guide

## A. Pre-deploy checklist

- [ ] CDP Client API Key obtained from [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com)
- [ ] Vercel CLI installed (`npm i -g vercel`)
- [ ] GitHub repo accessible to Vercel
- [ ] Farcaster custody wallet (with recovery phrase) for signing manifest
- [ ] Telegram bot token from @BotFather

## B. Deploy apps/miniapp to Vercel

```bash
cd ~/dev/serpha/sherpa

# Link to Vercel project
vercel link --cwd apps/miniapp  # project name: sherpa-miniapp

# Set environment variables
vercel env add NEXT_PUBLIC_URL production --cwd apps/miniapp
# Value: https://sherpa-miniapp.vercel.app

vercel env add NEXT_PUBLIC_SHERPA_API_BASE production --cwd apps/miniapp
# Value: Railway URL of apps/api

vercel env add SHERPA_API_BASE production --cwd apps/miniapp
# Value: same Railway URL of apps/api, used by /.well-known/farcaster.json

vercel env add NEXT_PUBLIC_ONCHAINKIT_API_KEY production --cwd apps/miniapp
# Value: your CDP Client API Key (cdp_pk_...)

vercel env add NEXT_PUBLIC_SHERPA_CHAIN production --cwd apps/miniapp
# Value: base-sepolia

# Deploy
vercel --prod --cwd apps/miniapp
```

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
# SHERPA_API_BASE (existing apps/api URL)
# SHERPA_WEB_BASE (https://sherpa-web.vercel.app)
# ADMIN_TG_USER_IDS (your TG user ID for beta)
```

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
