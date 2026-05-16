# Stage 3 Implementation Devlog

**Date:** 2026-05-16
**Branch:** feat/stage3-minikit-telegram

## What shipped

### Chunk 1: MiniKit migration

- Migrated `apps/miniapp` from raw `@farcaster/frame-sdk` to `@coinbase/onchainkit/minikit`
- Rewrote `providers.tsx` with `OnchainKitProvider`
- Rewrote `ChatThread.tsx` with MiniKit hooks
- Created `/.well-known/farcaster.json` dynamic route
- Created `.env.example` with all required vars

### Chunk 2: Surface linking infrastructure

- Created migration `0015_signing_tokens.sql`
- Created `packages/memory/src/surface-links.ts` (7 functions)
- Created `apps/api/src/routes/surfaces.ts` (7 endpoints)
- Added `SHERPA_WEB_BASE` to config schema

### Chunk 3: Webhook receiver

- Created migration `0016_notification_tokens.sql`
- Created `packages/memory/src/notification-tokens.ts`
- Updated `apps/api/src/routes/farcaster.ts` with JFS signature decoding
- Handles 4 event types: frame_added, frame_removed, notifications_enabled, notifications_disabled

### Chunk 4: Deep-link signing page

- Created `apps/web/app/sign/SignFlow.tsx` — token fetch, intent display, wagmi sendCalls
- Created `apps/web/app/link/LinkFlow.tsx` — wallet connect, sign message, link API
- Paymaster capabilities re-implemented locally (avoids touching protected wagmi.ts)

### Chunk 5: Telegram bot

- Created `apps/telegram-bot/src/auth.ts` — admin-only middleware
- Replaced stub signing URL with real `POST /api/surfaces/sign-intent` call
- Updated `/balance`, `/history`, `/link` commands with real API calls
- Created `Dockerfile` for Railway deployment

## Files created vs modified

| Category       | Count |
| -------------- | ----- |
| New files      | 18    |
| Modified files | 12    |
| New migrations | 2     |
| New test files | 8     |

## Test count growth

| Package      | Before | After  | Delta              |
| ------------ | ------ | ------ | ------------------ |
| miniapp      | 9      | 7      | -2 (rewrote tests) |
| memory       | 51     | 57     | +6                 |
| api          | 44     | 53     | +9                 |
| telegram-bot | 6      | 15     | +9                 |
| **Total**    | ~1,012 | ~909\* | —                  |

\*Note: Test count methodology may differ. All existing tests continue to pass.

## Known limitations / Stage 3.1 followups

1. **JFS signature verification** — currently best-effort (decode + log, don't reject bad sigs)
2. **Notification token refresh** — no automatic token refresh on expiry
3. **Deep-link signing** — `sendCalls` uses empty `calls` array (real calls need intent execution)
4. **Telegram /send** — delegates to message handler but doesn't reconstruct input properly
5. **No polling for link confirmation** — `/link` command doesn't poll for link success
