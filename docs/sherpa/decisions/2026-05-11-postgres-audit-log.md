# Postgres-backed audit log (M3 Priority 1)

Date: 2026-05-11
Owner: M3
Branch: `feat/m3-week-1-priority-1`

## Context

M1 ships in-memory audit log via `@sherpa/memory`'s `createAuditLog` /
`updateAuditLog` wrappers. Counters reset every cold start; we cannot answer
"did this user already submit a tx in the last 24h?" past a function instance
boundary. M3's job is to swap the implementation behind those wrappers
without touching M1's call sites.

## Decisions

### 1. Supabase pooler (port 6543) + `pg.Pool({ max: 1 })`

Vercel functions are short-lived and bursty. The free-tier Supabase Postgres
allows ~60 concurrent connections; if every warm Vercel instance opened a
larger pool we'd exhaust the limit during traffic spikes. The transaction-mode
pooler (pgbouncer in front of Postgres) multiplexes connections, so each
function instance only needs one client at a time.

Rejected: direct URL (5432) + max=5 — better for long-lived processes, worse
for serverless cold starts. The kickoff prompt suggested max=5; we explicitly
overrode to max=1 in the answer to clarifying question 4.

### 2. Optimistic concurrency on `updated_at`

`update()` reads `updated_at`, then conditionally writes
`WHERE id = $1 AND updated_at = $prev`. If another writer raced, rowCount is
0 and we throw `ConcurrentAuditUpdate`. Two reasons:

- Each audit row has at most two writers in the critical path (creator +
  confirm callback), so contention is rare.
- Row locks with `FOR UPDATE` would hold a connection between SELECT and
  UPDATE — bad on a max=1 pool through a transaction-mode pooler.

### 3. Extended interface, M1 untouched

Per clarifying-question answer 1: we extended `CreateAuditLogInput` with
optional `surface`, `rawInput`, `parsedIntent`, `plan`, `executedSteps`. The
existing `{userAddress, intent, planHash, submittedAt}` callers (M1's
executor) still compile and run. `apps/api/src/server.ts` (M3-owned)
populates the new fields when assembling the row, so we capture the richer
schema from day one without an M1 change.

### 4. RLS as defense-in-depth, service-role bypass

Stage-1 connections use Supabase's service role, which bypasses RLS. We
still `ENABLE ROW LEVEL SECURITY` and create a `audit_log_user_read` policy
keyed off `current_setting('app.current_user_address', true)`. Any future
anon-key surface inherits the policy automatically. Idempotent via
`DROP POLICY IF EXISTS` + `CREATE POLICY` — `CREATE POLICY IF NOT EXISTS` is
not valid Postgres syntax pre-PG16.

### 5. `migrate.sh` lands in P1, not P4

Per clarifying-question answer 2. P1 needs a real applier so the integration
smoke (`audit.postgres.integration.test.ts`) can run against a real DB
locally and pre-stage. P4 still adds `DATABASE_SETUP.md` and the production
runbook.

## Schema differences vs the kickoff prompt

The prompt's schema was the Stage-2 ideal. We additionally kept `intent`,
`plan_hash`, `submitted_at`, `confirmed_at` columns so the existing
in-memory interface fields have a one-to-one column. `tx_hashes` defaults to
`ARRAY[]::TEXT[]` (rather than NULL) so the snapshot query's
`array_length(tx_hashes, 1)` is sane on never-updated rows.

## Files

- `scripts/db/migrations/0001_audit_log.sql` — table + indexes + RLS policy
- `scripts/db/migrate.sh` — idempotent applier (tracks `_migrations`)
- `packages/config/src/db.ts` — `pg.Pool` factory + `query()` helper
- `packages/config/src/index.ts` — env zod schema (`SHERPA_USE_REAL_DB`,
  `DATABASE_URL`, `SUPABASE_SERVICE_KEY`)
- `packages/memory/src/audit.ts` — extended interface
- `packages/memory/src/audit.postgres.ts` — Postgres impl
- `packages/memory/src/index.ts` — `createAuditStore(config)` factory
- `apps/api/src/server.ts` — uses factory + populates surface/rawInput/etc

## Tests

- `packages/memory/src/audit.postgres.test.ts` — 11 tests, mocked pool
- `packages/memory/src/audit.postgres.integration.test.ts` — skipped without
  `DATABASE_URL`, runs against real DB when set
- 119 → 130 tests passing across the workspace; M1's existing executor
  tests still green

## What's unchanged

- M1's executor and parser code paths
- The default in-memory store still serves tests and `SHERPA_USE_REAL_DB=false`
  local dev — `pnpm test` does not require a database
- M2's surface
