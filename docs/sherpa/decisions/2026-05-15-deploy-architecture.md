# 2026-05-15 — Stage 1 deploy architecture: two Vercel projects, one origin

**Status:** accepted
**Owner:** M3 (infra/api)
**Surface:** apps/web, apps/api, docs/sherpa/setup

## Context

Stage 1 ships two surfaces from the same monorepo:

- `apps/web` — Next.js app (marketing, chat UI, wallet connect)
- `apps/api` — Fastify server (parse, execute, paymaster proxy, cron)

Vercel can host both. There are three viable layouts:

1. **Single project, port Fastify → Next.js Route Handlers.** Same
   origin, no CORS, no proxy hop.
2. **Two projects, same origin via Next.js rewrites.** Web project
   rewrites `/api/*` to the API project URL server-side. Browser
   sees same-origin, no CORS.
3. **Two projects, cross-origin via CORS.** Browser calls the API
   project URL directly. No rewrite hop, but every request pays a
   CORS preflight.

## Decision

**Option 2 — two projects, Next.js rewrites.**

The web project (`sherpa-web`) is configured with
`SHERPA_API_BASE=https://sherpa-api.vercel.app` so the existing
`apps/web/next.config.mjs` rewrite proxies every `/api/*` request to
the API project server-side. From the browser's perspective the API
is same-origin and CORS is a non-issue.

## Why not option 1 (port to Route Handlers)

Six existing Fastify routes — `/api/parse`, `/api/execute`,
`/api/execute/:id/confirm`, `/api/balance/:addr`, `/api/history/:addr`,
`/api/paymaster`, `/api/cron/hourly`, plus `/admin/llm-usage/*` —
together with the buildServer dependency-injection harness used
across ~37 server.test.ts cases. A port would be a 200+ LOC refactor
across all routes and tests, on the path to launch, with a real
regression budget.

Stage 2 may revisit this. If we end up with mostly Route Handlers in
`apps/web` for other reasons (server actions, edge functions), it
becomes worth folding the API in. Today the cost outweighs the
benefit.

## Why not option 3 (CORS + absolute URL)

Three reasons:

1. **A preflight per paymaster call.** wagmi's
   `pm_getPaymasterStubData` / `pm_getPaymasterData` are on the
   user-perceived latency path of every sponsored send. The preflight
   adds 50–150ms cold and shows up in p95.
2. **More moving parts.** A new `@fastify/cors` dep, an allow-list
   that has to track preview-deploy hostnames (`sherpa-app-*.vercel.app`),
   a `NEXT_PUBLIC_API_BASE` env that has to ship before
   `apps/web/lib/wagmi.ts` references it, and a wagmi.ts code change.
3. **The existing code already does option 2.** `next.config.mjs`
   already defines the rewrite. We just set the env var on the web
   project and option 2 works.

## What this means for ops

Production env on the **web** project:

```
SHERPA_API_BASE=https://sherpa-api.vercel.app
```

(Not `NEXT_PUBLIC_*` — rewrites run on the Vercel edge / Node runtime,
not in the browser. The URL stays server-side.)

**Deploy order:** `sherpa-api` first, then `sherpa-web`. If web ships
before api, every `/api/*` request 502s through the rewrite until api
catches up. The launch checklist enforces this.

## Stage 2+ revisit

Reconsider option 1 if any of these become true:

- We add server actions or edge functions to `apps/web` and end up
  with the API logic mostly in Route Handlers anyway.
- Preview deploys start needing per-PR API isolation (right now the
  web preview points at the prod API, which is fine for marketing/UI
  changes but not for API changes).
- We hit a real scaling problem that two-project decoupling would
  solve (independent autoscaling, separate cold-start budgets).

None of these are present today.

---

## migrate.sh verification (also Stage 1 blocker)

`scripts/db/migrate.sh` was reviewed for the prod migration step.
Findings:

**Good:**

- Idempotent via `_migrations(filename PRIMARY KEY, applied_at)`
  tracking table; already-applied filenames are skipped on every run.
- `set -euo pipefail` + `psql -v ON_ERROR_STOP=1` propagates the
  first SQL error up to a non-zero exit.
- Fails fast (`exit 2`) when `DATABASE_URL` is unset, `psql` is not
  on PATH, or the migrations directory is missing.
- Quotes every variable expansion, so a filename with a space would
  still apply correctly (we don't have any, but the script doesn't
  break if one is added).
- Uses `psql -v fname=…` + `:'fname'` for SQL-side variable
  escaping rather than string interpolation — no injection risk on
  the tracking-table read/write.
- Lexical sort of `migrations/*.sql` is correct given the `NNNN_`
  prefix convention.

**Edge cases worth knowing (not bugs):**

- **No outer transaction wraps the whole run.** If migration N
  succeeds and migration N+1 fails, N is committed and N+1 has its
  `_migrations` row missing — on rerun, N is skipped, N+1 retries.
  This is fine because every `.sql` in `migrations/` is written
  idempotently (`CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS;
  CREATE POLICY …`, the `DO $$ … $$` block in 0003 that drops by
  introspection rather than name). Any new migration must preserve
  this property.
- **Per-file atomicity depends on the file itself.** psql `-f` runs
  each statement in its own implicit transaction by default. If a
  future migration needs all-or-nothing semantics across multiple
  statements, the `.sql` file must wrap them in `BEGIN; … COMMIT;`.
  0001/0002/0003 don't need this.
- `shellcheck` not available locally to lint the script today, but
  the patterns (quoted expansions, `$()` over backticks, no unquoted
  `for path in $files`) match what shellcheck would enforce.

**Conclusion:** `migrate.sh` is correct for Stage 1. Run it as the
checklist documents (`DATABASE_URL=... bash scripts/db/migrate.sh`)
and it will apply `0001_audit_log.sql`, `0002_llm_usage.sql`, and
`0003_paymaster_ratelimit.sql` in order, then no-op on every
subsequent run.
