# M3 Week 1 — Complete

Date: 2026-05-14

## Shipped (5 PRs)

- PR #10: Postgres audit log + migration 0001
- PR #11: PR #10 bugfixes (TIMESTAMPTZ truncation, empty env vars)
- PR #13: Real identity backends (Neynar, Basenames, ENS, cache)
- PR #14: Postgres LLM spend cap + UsageSink + admin endpoints
- PR #15: Sentry + cron + smoke test (this PR)

## Test count

- Start: 119 (post M1 Week 3)
- End: 220 passing, 2 skipped

## New env vars added

- `SHERPA_USE_REAL_DB` — not sensitive
- `DATABASE_URL` — sensitive
- `SUPABASE_SERVICE_KEY` — sensitive
- `NEYNAR_API_KEY` — sensitive
- `NEYNAR_BASE_URL` — not sensitive
- `ALCHEMY_ETH_MAINNET_RPC` — sensitive-ish (provider key in URL)
- `KV_REST_API_URL` — not sensitive
- `KV_REST_API_TOKEN` — sensitive
- `ADMIN_API_KEY` — sensitive
- `SENTRY_DSN` — sensitive
- `SENTRY_ENVIRONMENT` — not sensitive
- `CRON_SECRET` — sensitive
- `SMOKE_API_URL` — not sensitive

## Migrations (2)

- `0001_audit_log.sql`
- `0002_llm_usage.sql`

## Real APIs wired

- Postgres (Supabase pooler URL via `@sherpa/config`)
- Neynar (Farcaster usernames)
- Base L2Resolver (Basenames)
- Ethereum mainnet RPC (ENS)
- Vercel KV (in-memory + KV cache layer)
- Sentry (`@sentry/node`)

## Free-tier discipline maintained

- Daily cap in `docs/sherpa/SHERPA_RUNTIME_API_COSTS.md` Part 7 enforced
- In-memory LRU cache before KV
- 7-day Farcaster cache, 1-hour Basename/ENS cache
- cron-job.org selected over Vercel Pro cron while the registry is empty

## Deferred to M3 Week 2

- Tenderly wiring (Stage 2 simulation gate for safety Ring 6)
- Rate limiter Postgres swap (still in-memory)
- Portfolio aggregation API endpoint (Moralis integration)
- Vercel KV cache for spend cap admin endpoints
- Telegram bot scaffold (Stage 4)
- apps/web Sentry wiring (M2 to opt in via `packages/logger/src/web.ts`)

## Cross-domain notes

### For M1

- `audit_log` redundant columns (`intent` TEXT + `parsed_intent` JSONB)
  remain. Resolve in M1 Stage 2 migration by switching writes to JSONB
  and dropping legacy TEXT columns.
- `SpendCap` interface is unchanged: M1's router calls `.check()` and
  `.record(costUsd)` as before. `UsageSink` is M3-only, called from
  apps/api with rich context (`userAddress`, `task`, `model`, etc.).
- Cron now imports the empty hourly registry from `@sherpa/scheduler`,
  so Stage 4 automation can register DCA/alert/monitor tasks below the
  API layer.

### For M2

- `packages/logger/src/web.ts` is ready to import when wiring apps/web
  Sentry. Do not import `@sentry/node`; use `@sentry/browser` via the
  helper.
- Client-side errors are not reported until M2 opts in.
