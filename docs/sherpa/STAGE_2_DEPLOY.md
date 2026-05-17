# Stage 2 Deployment Guide

Stage 2 write features (swap, lend, borrow, repay, withdraw) are deployed on Base
mainnet and controlled by environment flags. Positions are read-only and query Aave
directly.

Current production state:

- Web/API: Stage 2 Base mainnet cards are public.
- Contracts: verified, Safe-owned Base mainnet Router and Treasury.
- Telegram: can create web signing links when `SHERPA_STAGE_2_PUBLIC_MAINNET=true`
  is enabled on the bot service; otherwise it points users to the web app.

## Local Development

Add to your `.env` files:

```bash
# apps/api/.env
SHERPA_STAGE_2_ENABLED=true

# apps/web/.env
NEXT_PUBLIC_SHERPA_STAGE_2_ENABLED=true

# apps/miniapp/.env
NEXT_PUBLIC_SHERPA_STAGE_2_ENABLED=true

# apps/telegram-bot/.env
SHERPA_STAGE_2_PUBLIC_MAINNET=true
```

## Production

1. Set the environment variables in your deployment platform (Vercel, Railway, etc.):
   - `SHERPA_STAGE_2_ENABLED=true` on the API service
   - `SHERPA_STAGE_2_PUBLIC_MAINNET=true` on the API service
   - `NEXT_PUBLIC_SHERPA_STAGE_2_ENABLED=true` on web, miniapp, and telegram-bot
   - `SHERPA_STAGE_2_PUBLIC_MAINNET=true` on telegram-bot only if Telegram should create Stage 2 web signing links

2. Verify the API returns 200 for Stage 2 endpoints:
   ```bash
   curl https://your-api-domain.com/api/swap/quote
   # Should return 501 (not implemented) instead of 503 (feature_not_available)
   ```

3. Verify the web app shows Stage 2 navigation elements.

## Rollback

To disable Stage 2 features immediately:

1. Set `SHERPA_STAGE_2_ENABLED=false`, `SHERPA_STAGE_2_PUBLIC_MAINNET=false`,
   and `NEXT_PUBLIC_SHERPA_STAGE_2_ENABLED=false` in all environments.
2. Redeploy or restart services.
3. Stage 2 API routes return 503 with `{ error: 'feature_not_available', details: 'Stage 2 features are disabled in this environment.' }`.
4. Telegram bot points users to the web app instead of creating Stage 2 signing links.
5. Web app shows the environment-disabled placeholder for Stage 2 pages.

## What Is Gated

| Route | Method | Description |
|---|---|---|
| `/api/swap` | POST | Execute swap |
| `/api/swap/quote` | GET | Get swap quote |
| `/api/lend` | POST | Execute lend |
| `/api/lend/apy` | GET | Get lend APY |
| `/api/withdraw` | POST | Execute withdraw |
| `/api/borrow` | POST | Execute borrow |
| `/api/borrow/preview` | GET | Preview borrow |
| `/api/repay` | POST | Execute repay |
| `/api/positions/:address` | GET | Get positions (read-only; safe when Stage 2 writes are disabled) |

Stage 1 routes are **never** affected by this flag:

| Route | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check |
| `/api/parse` | POST | Parse natural-language input |
| `/api/execute` | POST | Execute a parsed intent |
| `/api/execute/:id/confirm` | POST | Confirm a pending execution |
| `/api/balance/:addr` | GET | Fetch on-chain balance for address |
| `/api/history/:addr` | GET | Fetch transaction history for address |
| `/admin/*` | GET | Admin endpoints (LLM usage, audit log) |
| `/api/paymaster` | POST | Coinbase Paymaster sponsorship |
| `/api/surfaces/*` | GET | Telegram, web, Farcaster surface configs |
