-- 0003_paymaster_ratelimit.sql — Sherpa M3 Stage 1 (paymaster proxy)
--
-- Per-address fixed-window rate limit for the `/api/paymaster` proxy.
-- One row per sender; `window_start` anchors the 24h fixed window and
-- `count` increments up to the configured limit (3 in Stage 1). Once
-- NOW() - window_start > 24h the row is reset on next check.
--
-- Idempotent: safe to re-run.
--
-- Also extends the audit_log surface CHECK so `surface='paymaster'`
-- rows pass. The CHECK was anonymous in 0001 so Postgres auto-named
-- it `audit_log_surface_check`; we drop+re-add with the new member.

CREATE TABLE IF NOT EXISTS paymaster_ratelimit (
  user_address  TEXT PRIMARY KEY,
  count         INT NOT NULL DEFAULT 0,
  window_start  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Window-bucket scans (resetting expired buckets, future cleanup jobs)
-- benefit from an index on window_start.
CREATE INDEX IF NOT EXISTS idx_paymaster_ratelimit_window
  ON paymaster_ratelimit (window_start);

ALTER TABLE paymaster_ratelimit ENABLE ROW LEVEL SECURITY;

-- Defense-in-depth: stage-1 connections use the service role (bypasses
-- RLS), but a future anon-key surface should only see its own row.
DROP POLICY IF EXISTS paymaster_ratelimit_user_read ON paymaster_ratelimit;
CREATE POLICY paymaster_ratelimit_user_read ON paymaster_ratelimit
  FOR SELECT
  USING (user_address = current_setting('app.current_user_address', true));

-- Extend audit_log.surface to permit 'paymaster' rows.
--
-- The 0001 migration declared the CHECK inline on the column, so Postgres
-- auto-named it `audit_log_surface_check`. If anyone re-creates that
-- constraint manually it might land under a different name — we look it
-- up in pg_constraint by definition rather than guessing, then drop+re-add.
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
    FROM pg_constraint
   WHERE conrelid = 'audit_log'::regclass
     AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%surface%IN%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE audit_log DROP CONSTRAINT %I', cname);
  END IF;
END $$;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_surface_check
  CHECK (surface IN ('web', 'miniapp', 'telegram', 'api', 'cron', 'paymaster'));
