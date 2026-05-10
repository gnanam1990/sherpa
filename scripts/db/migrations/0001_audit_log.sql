-- 0001_audit_log.sql — Sherpa M3 Stage 1
--
-- Replaces the in-memory AuditStore with a durable Postgres table.
-- Idempotent: safe to re-run.
--
-- Owned by M3. M1 writes via packages/memory wrappers, never raw SQL.

CREATE TABLE IF NOT EXISTS audit_log (
  id              BIGSERIAL PRIMARY KEY,
  user_address    TEXT NOT NULL,
  surface         TEXT NOT NULL DEFAULT 'api'
                   CHECK (surface IN ('web', 'miniapp', 'telegram', 'api', 'cron')),
  raw_input       TEXT NOT NULL DEFAULT '',
  intent          TEXT,
  plan_hash       TEXT,
  parsed_intent   JSONB,
  plan            JSONB,
  executed_steps  JSONB,
  tx_hashes       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  status          TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'success', 'failed', 'cancelled', 'partial')),
  error_detail    TEXT,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_created
  ON audit_log (user_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_status_pending
  ON audit_log (status) WHERE status = 'pending';

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- DROP+CREATE for idempotency. Postgres has no `CREATE POLICY IF NOT EXISTS`
-- prior to PG16. Stage-1 connections all use the service role (which bypasses
-- RLS), so this policy is defense-in-depth for any future anon-key surface.
DROP POLICY IF EXISTS audit_log_user_read ON audit_log;
CREATE POLICY audit_log_user_read ON audit_log
  FOR SELECT
  USING (user_address = current_setting('app.current_user_address', true));
