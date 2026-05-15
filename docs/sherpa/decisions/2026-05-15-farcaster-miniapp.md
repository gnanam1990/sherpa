# Decision: Farcaster Mini App (Stage 3 P1)

**Date:** 2026-05-15
**Status:** Accepted
**Stage:** 3 P1

## Context
Sherpa needs a Farcaster Mini App to reach crypto-native users on Warpcast.

## Decisions

### Why Farcaster
- Base-adjacent audience (most Base users are on Farcaster)
- Fastest crypto-native distribution channel
- Frame v2 enables full app experiences

### Frame v2 Design
- Mobile-first, narrow viewport
- Reuses @sherpa/ui components
- No marketing copy (users came from cast)
- Touch-friendly buttons (44pt minimum)

### FID → Smart Wallet Binding
- First connect: auto-create Smart Wallet bound to FID
- Stored in Supabase fid_smartwallet_links table
- Verified after first transaction

### Architecture
- apps/miniapp: separate Next.js 15 app
- Reuses packages/core, packages/tools, packages/ui
- Deploys to separate Vercel project
- Webhook endpoint in apps/api

## Future Work
- Shared session between web and Mini App
- Deep links from casts
- Notification via Frame webhook
