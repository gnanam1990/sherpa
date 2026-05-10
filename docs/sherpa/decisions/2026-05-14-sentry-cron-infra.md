# Sentry + Cron infrastructure

**Date:** 2026-05-14
**Branch:** `feat/m3-week-1-priority-4`
**Owner:** M3

## What shipped

- `@sherpa/logger`:
  - `sentry.ts` — `initSentry(config, sdk)` + `captureError(err, surface, extra)`
  - `index.ts` — `createLogger().error()` now fans out to Sentry with
    `surface` as a tag and the rest of `meta` as extras
  - `web.ts` — separate browser-side helper for M2 to opt into later
- `apps/api`:
  - `src/routes/cron.ts` — `CronTask` type, `HOURLY_TASKS` registry
    (empty for Stage 1), `registerCronRoutes(app, deps)` mounted in
    `buildServer()`
  - Sentry init in `buildServer()` (no-op without DSN)
- `scripts/smoke/m3-smoke.ts` — human-run pre-stage-gate smoke
- `.env.example`: `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `CRON_SECRET`
- Docs: `setup/CRON_JOB_ORG_SETUP.md`, `setup/DATABASE_SETUP.md`,
  this file

## Key decisions

### 1. Sentry SDK = `@sentry/node`, not `@sentry/serverless`

`@sentry/serverless` was deprecated by Sentry in 2024. `@sentry/node`
is the supported path on Vercel functions and any other Node runtime,
and the only path that gets ongoing fixes. Single dep, works in both
Fastify and the cron route.

Tracing is off (`tracesSampleRate: 0`) — errors-only. Flipping on
tracing without a defined performance budget would just spend our
quota.

### 2. Why Sentry over self-hosted

Sentry's free Developer plan covers 5,000 errors/month. Through
Stage 1 we're well under that — pre-revenue, single-region, single-
function. Self-hosted (GlitchTip et al.) would mean another deploy
target, another auth surface, another thing to monitor. Revisit if
we ever hit the quota or sign anything that requires data residency
guarantees the SaaS can't provide.

### 3. Why cron-job.org over Vercel Pro cron

Vercel Pro adds $20/month and includes cron — fine forever once we
have revenue, but Stage 1 is pre-revenue and the cron does nothing
yet (empty registry). cron-job.org is free, supports Bearer headers,
and emails on failure. Re-evaluate when:

- We move to Vercel Pro for other reasons (preview deployments
  beyond the free quota, longer function timeouts, etc.); OR
- A task in the registry needs <1-minute granularity (cron-job.org
  free is 1-minute minimum, paid Pro is 1-second).

### 4. Why `/api/cron` lives in apps/api, not apps/web

apps/web is M2's domain. Touching it pulls in M2 review, M2
deploy concerns, the Next.js routing layer. The cron is purely a
backend hook; the cleanest seam was a Fastify POST route inside
apps/api alongside the rest of M3's surface.

For M2: `packages/logger/src/web.ts` exists as a separate export
with `initWebSentry(config, sdk)`. M2 can opt in any time without
M3 needing to ship.

### 5. Per-task audit_log rows (not summary rows)

`POST /api/cron/hourly` writes one `audit_log` row per task with
`intent='CRON:${name}'` and `surface='cron'`. The alternative — one
summary row per POST with executed_steps holding pass/fail counts —
would be simpler but worse: failed tasks would be invisible to
`SELECT … WHERE status='failed'` queries and dashboards would have
to JSON-parse executed_steps to learn which task broke.

`user_address` on cron rows is the all-zeros address
(`0x0000…0000`); `audit_log.user_address` is `NOT NULL`, so we need
a sentinel that is unambiguously not a real user.

### 6. Constant-time bearer compare for cron + admin

`crypto.timingSafeEqual` after a length-equality short-circuit. Same
pattern as PR #14's admin endpoints. The 4-bytes-of-extra-code is
worth it here because both routes are publicly addressable and a
bearer-token timing oracle is the kind of thing that ages badly.

### 7. Smoke test exit policy: skip-when-unset, fail-when-broken

Each check looks for its own env var (`DATABASE_URL`,
`NEYNAR_API_KEY`, `CRON_SECRET`+`SMOKE_API_URL`). Unset → SKIP, set
but the call fails → FAIL, all good → PASS. Process exits 1 only
if anything FAILed. Lets a partially configured laptop smoke the
configured surfaces without spurious "everything is broken"
output, while still being CI-friendly when run with everything set.

## Cross-domain notes

- **M1**: nothing changes. The router didn't grow new error paths;
  existing `console.error` callers continue to work, and any caller
  that switches to `log.error()` automatically gets Sentry coverage
  with no code changes downstream.
- **M2**: `packages/logger/src/web.ts` is the agreed integration
  point. Use `NEXT_PUBLIC_SENTRY_DSN` (separate from server-side
  `SENTRY_DSN` — Sentry scopes DSNs per platform). Until M2 opts in,
  client-side errors are not reported.

## Follow-ups (deferred to M3 Week 2)

- Pino swap. The `@sherpa/logger` facade is pino-compatible; Week 2
  drops `pino` in for the structured-output pretty-print and async
  flush behaviour.
- Stage 4 cron tasks: `price_refresh` (gas/fee snapshot), gas-cap
  recalibration, optional rate-limiter prune.
- Vercel KV runtime cache for the resolver layer (currently in-memory
  + KV stub).
