# Database setup

Sherpa runs on Supabase Postgres (free tier through Stage 1). M3 owns
the schema; M1 writes via `@sherpa/memory` wrappers, never raw SQL.

## One-time provisioning

1. **Create a Supabase project** at https://supabase.com/dashboard.
   Pick the region closest to your Vercel deployment region.

2. **Get the pooler connection string** (transaction-mode, port 6543).
   Settings → Database → Connection pooling → Mode: Transaction. Copy
   the URL — it's the value of `DATABASE_URL`.

3. **Set env vars** (Production + Preview):

       vercel env add DATABASE_URL production
       vercel env add DATABASE_URL preview
       vercel env add SHERPA_USE_REAL_DB production   # value: true
       vercel env add SHERPA_USE_REAL_DB preview      # value: true
       vercel env add SUPABASE_SERVICE_KEY production # if used by future surfaces

   Local `.env.local` mirrors these. With `SHERPA_USE_REAL_DB=false`
   (default) every storage adapter falls back to in-memory — handy for
   unit tests, harmful for integration smokes.

## Run migrations

       pnpm tsx scripts/db/migrate.sh        # applies every migration in order

Applied migrations are tracked by `_migrations` (created on first
run). Re-running is idempotent.

Current migrations:

| File                          | Adds                                  |
| ----------------------------- | ------------------------------------- |
| `0001_audit_log.sql`          | `audit_log` table + RLS               |
| `0002_llm_usage.sql`          | `llm_usage` table + 2 indexes + RLS   |

## Smoke before stage gate

       DATABASE_URL=postgres://... pnpm tsx scripts/smoke/m3-smoke.ts

Round-trips an `audit_log` row + `llm_usage` row, asserts both are
visible, then deletes them. Cleans up after itself; safe to run on
production as long as you trust the cleanup (synthetic
`user_address` is randomised per run).

## Cross-references

- Cron infrastructure (also writes to `audit_log` with
  `surface='cron'`): `docs/sherpa/setup/CRON_JOB_ORG_SETUP.md`.
- Decision log for the cap-counter / row-writer split:
  `docs/sherpa/decisions/2026-05-13-postgres-spend-cap.md`.
