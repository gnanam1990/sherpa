# 2026-05-15 — M2 Week 1 Priority 3

## Scope

Priority 3 adds a chat-style message thread above the prompt input. The thread is the visible session log for user prompts, Sherpa thinking, confirmation cards, completed actions, and failed actions.

## Current M3 contract

`GET /api/history/:addr?limit=N` exists and returns `{ address, chain, items }`, where `items` are `HistoryItem[]` with fields such as `txHash`, `timestamp`, `direction`, `counterparty`, `asset`, `amountDisplay`, and optional `sherpaIntent`.

P3 maps `HistoryItem[]` into compact completed-action Sherpa bubbles in the frontend. Initial load requests `?limit=50`; if 50 items are returned, the UI offers `Load older messages`, which fetches `?limit=200` and replaces the visible server-history segment.

## M3 to add

- M3 to add (post Stage 1): either `GET /api/history/:addr/messages` returning `Message[]` directly, or extend `HistoryItem` with `messageType` field. P3 ships with frontend inference logic from `HistoryItem` shape.
- M3 to add: `POST /api/history/:addr/messages` for appending new in-session messages. P3 stores in-memory only; messages don't persist across reconnects today.
- M3 to update: `/api/history/:addr?limit=200` currently clamps to 50 in `apps/api/src/server.ts`. P3 still sends `?limit=200` for `Load older messages`, but the backend must raise the cap or add a cursor/message endpoint for the link to return more than the latest 50 rows.

## Cross-domain limitation

The `/api/paymaster` proxy is still M3's responsibility. Sponsored transactions may fail until that route lands. The P3 thread is independent of transaction success: it records successful and failed actions, so the UI remains complete while paymaster work proceeds in a separate PR.
