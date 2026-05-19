# Sherpa Mini App

Part of the Sherpa open source project. See the
[root README](../../README.md) for the full project overview, contracts, audit
status, and release posture.

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

| Variable                         | Description                                                         |
| -------------------------------- | ------------------------------------------------------------------- |
| `NEXT_PUBLIC_URL`                | Deployed URL of this app (e.g. `https://sherpa-miniapp.vercel.app`) |
| `NEXT_PUBLIC_SHERPA_API_BASE`    | Sherpa API base URL (browser-side)                                  |
| `SHERPA_API_BASE`                | Sherpa API base URL (server-side, for rewrites)                     |
| `NEXT_PUBLIC_ONCHAINKIT_API_KEY` | Coinbase OnchainKit API key (CDP console)                           |
| `NEXT_PUBLIC_BUILDER_CODE`       | Coinbase builder attribution code (e.g. `bc_97ju6eu2`)              |
| `FARCASTER_HEADER`               | Account association header from Farcaster manifest tool             |
| `FARCASTER_PAYLOAD`              | Account association payload from Farcaster manifest tool            |
| `FARCASTER_SIGNATURE`            | Account association signature from Farcaster manifest tool          |

### Farcaster Mini App Registration

To register this app as a Farcaster Mini App:

1. Deploy the app and ensure `NEXT_PUBLIC_URL` is set to the public URL.
2. Visit the [Farcaster Mini App Manifest Tool](https://farcaster.xyz/~/developers/mini-apps/manifest).
3. Enter the domain only, for example `sherpa-miniapp.vercel.app`, and follow the signing steps to obtain `FARCASTER_HEADER`, `FARCASTER_PAYLOAD`, and `FARCASTER_SIGNATURE`.
4. Add those values to your deployment environment variables.
5. Verify the manifest at `https://your-app-url/.well-known/farcaster.json`.

### Base App Registration

Base App discovery uses the Base.dev project record and standard web app metadata.
Keep the Base.dev app record pointed at this deployment, verify the `base:app_id`
meta tag in `app/layout.tsx`, and make sure the project metadata includes the same
icon, screenshots, category, description, and Builder Code. Set
`BASE_BUILDER_OWNER_ADDRESS` to the wallet that owns the imported Base.dev app
record so the manifest exposes `baseBuilder.ownerAddress`.

## Architecture

- **providers.tsx** — `OnchainKitProvider` with MiniKit enabled
- **ChatThread.tsx** — Chat UI using MiniKit hooks + `/api/parse`
- **lib/farcaster-connect.ts** — Farcaster SDK context extraction
- **lib/builder.ts** — Coinbase builder attribution (`NEXT_PUBLIC_BUILDER_CODE` → `dataSuffix`)
- **.well-known/farcaster.json/** — Dynamic Farcaster manifest route with `miniapp` + `frame` fallback
- **next.config.ts** — Same-origin `/api/*` rewrites to `SHERPA_API_BASE`
