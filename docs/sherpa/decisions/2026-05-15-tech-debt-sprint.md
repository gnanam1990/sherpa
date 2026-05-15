# Decision: Tech Debt Sprint

**Date:** 2026-05-15
**Status:** Accepted

## Context
After completing Stages 1-4, address remaining tech debt from PRD §14.

## Items Addressed

### 1. Sentry Browser Monitoring (apps/web)
- Added @sentry/nextjs to apps/web
- Created sentry.client.config.ts and sentry.server.config.ts
- Wrapped next.config.mjs with withSentryConfig
- Updated error.tsx to capture exceptions
- DSN from NEXT_PUBLIC_SENTRY_DSN env var

### 2. audit_log JSONB
- Already using JSONB (migration 0001). No action needed.

### 3. Paymaster Rate Limit
- Already has Postgres implementation. No action needed.
- In-memory for dev, Postgres for production.

### 4. Admin Paymaster-Usage Endpoint
- Added GET /admin/paymaster-usage/today
- Added GET /admin/paymaster-usage/user/:address
- Added GET /admin/audit-log/today
- Uses existing adminGuard pattern

### 5. UserOp Signature Verification
- Added packages/safety/src/signature.ts
- Validates UserOp fields (sender, callData, maxFeePerGas)
- Verifies signature is present and non-empty
- Wired into paymaster route as pre-rate-limit gate
- Prevents rate-limit exhaustion with invalid UserOps

## Security Improvement
UserOp signature verification now runs BEFORE rate limit consumption.
Invalid UserOps are rejected without consuming rate-limit slots.
