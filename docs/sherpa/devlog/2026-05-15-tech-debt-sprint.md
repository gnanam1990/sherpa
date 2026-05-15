# Tech Debt Sprint

**Date:** 2026-05-15

## What was done
- Wired @sentry/nextjs into apps/web (client + server + error boundary)
- Added admin endpoints for paymaster-usage and audit-log stats
- Implemented UserOp signature verification module
- Wired signature verification into paymaster route as pre-rate-limit gate

## Items skipped (already done)
- audit_log JSONB: already using JSONB since migration 0001
- Paymaster rate limit: already has Postgres implementation

## Key files changed
- apps/web/sentry.client.config.ts (new)
- apps/web/sentry.server.config.ts (new)
- apps/web/instrumentation.ts (new)
- apps/web/next.config.mjs (Sentry wrapper)
- apps/web/app/error.tsx (Sentry.captureException)
- apps/api/src/server.ts (admin routes)
- packages/safety/src/signature.ts (new)
- apps/api/src/routes/paymaster.ts (sig verification)

## Tests
- signature.test.ts: 7 tests for UserOp verification
- Admin endpoints: manual verification (requires DB)
