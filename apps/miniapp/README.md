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

See `.env.example` for required variables.

## Architecture

- **providers.tsx** — `OnchainKitProvider` with MiniKit enabled
- **ChatThread.tsx** — Chat UI using MiniKit hooks + `/api/parse`
- **lib/farcaster-connect.ts** — Farcaster SDK context extraction
- **.well-known/farcaster.json/** — Dynamic Farcaster manifest route
