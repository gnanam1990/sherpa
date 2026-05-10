# Postgres-backed LLM spend cap + cost reporting

**Date:** 2026-05-13
**Branch:** `feat/m3-week-1-priority-3`
**Owner:** M3
**Migration:** `scripts/db/migrations/0002_llm_usage.sql`

## What shipped

- Migration `0002_llm_usage.sql` — durable `llm_usage` table, 2 indexes, RLS.
- `@sherpa/memory` adapters:
  - `createPostgresSpendCap(pool)` — daily-cap circuit breaker; hydrates
    via `SELECT SUM(cost_usd)` then tracks increments in-memory.
  - `createPostgresUsageSink(pool)` — INSERTs one row per LLM call.
  - `fetchTodayUsage(pool)` / `fetchUserUsage(pool, addr)` — read-side
    helpers backing the admin endpoints.
- Factories `createSpendCap(config)` and `createUsageSink(config)` next to
  `createAuditStore` in `@sherpa/memory/index.ts`.
- Router (`@sherpa/llm`) updates: `LLMUsage` gains `model` + `latencyMs`;
  `LLMRequest` gains optional `userAddress`; `RouterConfig.onUsage`
  receives `(resp, ctx: { task, userAddress? })`. `SpendCap` interface
  relaxed to `void | Promise<void>` so the Postgres impl can hydrate
  asynchronously without breaking the in-memory caller.
- `apps/api`:
  - `/admin/llm-usage/today` and `/admin/llm-usage/user/:address` behind
    a constant-time bearer-token check against `ADMIN_API_KEY`.
  - `defaultLlmComplete` now constructs the cap + sink based on
    `SHERPA_USE_REAL_DB`.
  - Execute-path threads `userAddress` through `parseWithLLM` so the
    parser call records its caller; `/api/parse` (pre-auth) records NULL.
- Config: `ADMIN_API_KEY` validated as 64-char lowercase hex; same
  `z.preprocess(emptyToUndefined, ...)` pattern as PR #11.

Tests: 168 → 193 (+25), all green. 2 integration tests skipped without
`DATABASE_URL`.

## Key decisions

### 1. Split SpendCap (cap) and UsageSink (rows)

**Tension:** the kickoff said `SpendCap.record(costUsd)` performs the
INSERT into `llm_usage`. But the row schema needs `task`, `model`,
`user_address`, `latency_ms` — none of which are in `record()`'s
signature, and the kickoff also said *"M1's router.ts already calls
spendCap.check() and record() — no router changes needed."*

**Resolution:** SpendCap stays narrow (cap counter only). The actual row
INSERT goes through the router's existing `onUsage` hook, with the
signature widened to `(resp, ctx)` so `task` and `userAddress` reach the
sink. This honours the spirit of "no functional router changes" — the
gate hook is unchanged, the sink hook gains a context argument — while
populating every column the reporting endpoints need.

`PostgresSpendCap.record(cost)` therefore does **not** INSERT. It only
bumps an in-memory counter that was hydrated from `SELECT SUM(cost_usd)`
on first call. `spend-cap.postgres.test.ts` includes an explicit
"record() must NOT issue an INSERT" assertion to stop this regressing.

### 2. Factory lives in `@sherpa/memory`, not `@sherpa/llm`

**Tension:** the clarifying-question preview placed the
`createSpendCap(config)` switch in `packages/llm/src/spend-cap.ts`. But
`@sherpa/memory` already imports the `SpendCap` interface from
`@sherpa/llm` (the Postgres impl needs it). Putting the factory in
`@sherpa/llm` would have created a dependency cycle.

**Resolution:** `createSpendCap` lives in `@sherpa/memory/index.ts`
alongside `createAuditStore` and `createUsageSink`. The router still
imports the `SpendCap` interface from `@sherpa/llm` exactly as before.
Pattern is consistent with the existing `createAuditStore` precedent.

### 3. `user_address` is nullable

`/api/parse` runs before the user supplies an address, so its parser
LLM call has nothing to record. The schema makes `user_address TEXT`
(nullable); pre-auth rows record NULL. The `/admin/llm-usage/user/:addr`
query joins on `LOWER(user_address) = LOWER($1)` so NULL rows are
naturally excluded; `/admin/llm-usage/today` aggregates everything,
nulls included.

### 4. Date filter uses `date_trunc` on both sides

`WHERE date_trunc('day', created_at) = date_trunc('day', NOW())`. This
keeps the comparison entirely server-side — no JS Date crosses into the
SQL — sidestepping the TIMESTAMPTZ-µs vs JS-Date-ms truncation footgun
PR #10's audit-log update path tripped on. Asserted by a regression test
that fails if either side loses its `date_trunc`.

### 5. ADMIN_API_KEY format = 64-char lowercase hex

`openssl rand -hex 32`. Validated by zod regex at boot — a typo'd or
partial paste fails fast rather than silently 401-ing legitimate
callers. The bearer comparison uses `crypto.timingSafeEqual` (after a
constant-time length check). When unset, `/admin/*` returns **503**
(route disabled), not 401 — so misconfigured deployments are
distinguishable from credential errors.

### 6. Pagination = hardcoded `LIMIT 100`

Per the literal kickoff spec ("last 100 calls"). The
`idx_llm_usage_user_created` partial index backs the query.
`?limit&offset` can be added later without a schema change.

## Multi-instance correctness (known limitation)

Each Vercel function instance hydrates its cap counter from Postgres on
cold start, but between hydrates instances only see their own
`record()` increments. Effective cap is therefore (cap × instance count)
in the worst case. Acceptable for the build-phase $50/day soft limit;
documented in `spend-cap.postgres.ts`. When we scale horizontally we
either re-hydrate per-call (slow but correct) or move the counter into
Redis.

## Follow-ups

- `?limit&offset` on `/admin/llm-usage/user/:address` if 100 stops being
  enough.
- Move counter to Redis if we run more than ~2 concurrent function
  instances.
- A `status` column on `llm_usage` if we ever want to record failed
  calls without inflating the cap total. Today only successful calls
  are recorded (the router only fires `onUsage` on the happy path).
