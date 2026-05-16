# Sherpa Mini App

Farcaster + Base App mini app for Sherpa.

## Setup

```bash
cd ~/dev/serpha/sherpa
pnpm install
pnpm --filter @sherpa/miniapp dev
```

Open http://localhost:3200

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_URL` | Deployed URL of this app (e.g. `https://sherpa-miniapp.vercel.app`) |
| `NEXT_PUBLIC_SHERPA_API_BASE` | Sherpa API base URL (browser-side) |
| `SHERPA_API_BASE` | Sherpa API base URL (server-side, for rewrites) |
| `NEXT_PUBLIC_ONCHAINKIT_API_KEY` | Coinbase OnchainKit API key (CDP console) |
| `NEXT_PUBLIC_BUILDER_CODE` | Coinbase builder attribution code (e.g. `bc_97ju6eu2`) |
| `FARCASTER_HEADER` | Account association header from Farcaster manifest tool |
| `FARCASTER_PAYLOAD` | Account association payload from Farcaster manifest tool |
| `FARCASTER_SIGNATURE` | Account association signature from Farcaster manifest tool |

### Farcaster Mini App Registration

To register this app as a Farcaster Mini App:

1. Deploy the app and ensure `NEXT_PUBLIC_URL` is set to the public URL.
2. Visit the [Farcaster Mini App Manifest Tool](https://warpcast.com/~/developers/mini-apps) in your Warpcast developer settings.
3. Enter your app URL and follow the signing steps to obtain `FARCASTER_HEADER`, `FARCASTER_PAYLOAD`, and `FARCASTER_SIGNATURE`.
4. Add those values to your deployment environment variables.
5. Verify the manifest at `https://your-app-url/.well-known/farcaster.json`.

## Architecture

- **providers.tsx** — `OnchainKitProvider` with MiniKit enabled
- **ChatThread.tsx** — Chat UI using MiniKit hooks + `/api/parse`
- **lib/farcaster-connect.ts** — Farcaster SDK context extraction
- **lib/builder.ts** — Coinbase builder attribution (`NEXT_PUBLIC_BUILDER_CODE` → `dataSuffix`)
- **.well-known/farcaster.json/** — Dynamic Farcaster manifest route
- **next.config.ts** — Same-origin `/api/*` rewrites to `SHERPA_API_BASE`
