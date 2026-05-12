# 2026-05-15 — Paymaster RPC proxy at `/api/paymaster`

**Status:** accepted
**Owner:** M3 (infra/api)
**Surface:** apps/api, packages/memory, packages/config

## Context

wagmi's `useSendCalls` flow (EIP-5792) reads
`capabilities.paymasterService.url` and POSTs JSON-RPC requests to it
during UserOp construction:
- `pm_getPaymasterStubData`
- `pm_getPaymasterData`

Both requests carry the smart-wallet address in `params[0].sender`.

The naive integration is to set `paymasterService.url` to the Coinbase
Paymaster RPC directly, exposing it to the browser. We don't do that.

## Decision

Add a server-side proxy at `POST /api/paymaster` that wagmi targets.
The proxy validates the request envelope, gates per-sender, audit-logs
the call, then forwards the body verbatim to `SHERPA_PAYMASTER_RPC`.

## Why proxy instead of direct browser → Coinbase

1. **Keep the RPC URL server-side.** The URL embeds the policy token
   that authorizes spending against our Coinbase budget. Exposed
   client-side, anyone with devtools can drain the pool — there is no
   user-level auth on the upstream RPC itself.
2. **Per-user gating.** Coinbase only enforces a global budget; we add
   `paymaster_ratelimit` (3 sponsored UserOps / 24h / address) so one
   user can't monopolize the daily budget.
3. **Stage 2 hook point.** Ring 6/7 will add UserOp signature
   verification before the rate limit decrements. Doing it in our own
   proxy means no client change when that lands.

## Rate-limit shape

**Per-sender, fixed 24h window, limit = 3.**

Math behind the 3/24h number: Stage 1 Coinbase budget is ~$50/day,
average UserOp gas on Base Sepolia is ~$0.10, so ~500 sponsored ops/day
total. Three per address keeps a single user under 1% of daily budget
and forces user-level distribution if we want headroom for a public
demo.

**Why fixed instead of rolling:** a rolling 24h window needs one row
per call and a SUM/COUNT-back-N-hours query path; fixed needs one row
per address and a simple `window_start` compare. The schema is
`(user_address PRIMARY KEY, count, window_start)`. The window rolls
forward only when `NOW() - window_start > 24h`. The added unfairness
(a user who burns 3 ops at hour 23 has to wait one hour, not 24) is
acceptable for Stage 1; if needed we'll move to a token-bucket impl
backed by Redis in Stage 2.

**Multi-instance correctness:** identical to the spend-cap precedent —
the read-modify-write isn't transactional, so effective cap is
`limit × instances` in the worst case. Acceptable; revisit when we
scale horizontally.

## Sender extraction

We trust `params[0].sender` in Stage 1. There is no signature on the
JSON-RPC envelope at this layer; a hostile client could rate-limit
*someone else's* address by spoofing. That is acceptable because the
worst-case damage is `3 × failed_ops` against another user before the
upstream paymaster rejects them. Stage 2 (Ring 6/7) will require a
signed UserOp before the rate limit decrements.

## Cost model

Coinbase tracks the absolute spend cap upstream. We only gate
*per-user* to prevent a single address from monopolizing the daily
pool. We do not attempt to compute estimated gas per UserOp — Coinbase
does that and rejects when the policy budget is exhausted.

## Upstream-failure handling

The proxy distinguishes three failure modes:

| Upstream | Client status | Audit row     | Rate limit |
| -------- | ------------- | ------------- | ---------- |
| 2xx JSON | 2xx (forward) | `success`     | consumed   |
| 5xx     | 502           | `failed`      | refunded   |
| Throw   | 502           | `failed`      | refunded   |

Refunding on 5xx / network failure means a Coinbase outage doesn't
drain a user's quota. The 502 response body is always
`{ error: 'paymaster_upstream_error' }` — we never surface upstream
error bodies or hostnames because they can carry policy tokens.

## Response headers (success path)

- `X-Sherpa-Paymaster-Remaining: <n> of 3` — visible to the frontend
  so we can show "2 sponsored ops left today" in the UI.
- `X-Sherpa-Paymaster-Resets-At: <ISO>` — also set on 429s.

## Out of scope

- `/api/admin/paymaster-usage` endpoint — visibility is via
  `audit_log` rows (`WHERE surface='paymaster'`). Admin endpoint can
  land in a follow-up if we need it before Stage 2.
- Versioned route path (`/api/v1/paymaster`). The client already calls
  `/api/paymaster`; versioning becomes a concern when we have a second
  paymaster-like surface.
- UserOp signature verification (Stage 2 / Ring 6-7).
- Redis-backed token bucket (Stage 2 if horizontal scaling lands).
