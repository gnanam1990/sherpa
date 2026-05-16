# Decision: MiniKit for Farcaster + Base App Mini App

**Date:** 2026-05-16
**Status:** Accepted
**Stage:** 3

## Context

Sherpa needs a Mini App that works on both Farcaster (Warpcast) and Base App. The initial scaffold used raw `@farcaster/frame-sdk`, which only targets Farcaster clients.

## Decision

Use `@coinbase/onchainkit/minikit` (Coinbase's official Mini App library) instead of raw `@farcaster/frame-sdk`.

### Why MiniKit

1. **One codebase, two targets**: MiniKit supports both Base App and Farcaster (Warpcast + other clients) from a single codebase
2. **Official support**: Maintained by Coinbase, aligned with Base ecosystem
3. **Built-in hooks**: `useMiniKit`, `useAddFrame`, `useNotification` simplify common patterns
4. **Smart Wallet integration**: Works with Coinbase Smart Wallet out of the box

### Trade-offs

- **Tighter coupling to Coinbase tooling** — acceptable since Sherpa is Base-native
- **API surface may change** — MiniKit is newer than raw Frame SDK
- **Bundle size** — OnchainKit is larger than raw frame-sdk

### Alternatives considered

- **Raw `@farcaster/frame-sdk`**: More control, but only targets Farcaster clients
- **Custom abstraction**: Too much surface area for Stage 3

## Consequences

- `apps/miniapp` migrated from raw frame-sdk to OnchainKit
- `OnchainKitProvider` wraps the app with `miniKit={{ enabled: true }}`
- Existing wagmi + viem + React Query stack preserved
