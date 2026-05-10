-- 0002_llm_usage.sql — Sherpa M3 Week 1 Priority 3
--
-- Per-call LLM usage rows for cost reporting and the daily spend cap.
-- Idempotent: safe to re-run.
--
-- The daily spend cap (`PostgresSpendCap` in @sherpa/memory) hydrates from
-- this table on construction via `SELECT SUM(cost_usd)` over today's rows;
-- per-call increments are tracked in-memory afterwards. Aggregation queries
-- under /admin/llm-usage/* SUM/GROUP BY directly off this table.
--
-- `user_address` is nullable on purpose: /api/parse runs pre-auth (parser
-- LLM call before the user has supplied their address), so those rows
-- record with NULL. The execute path threads userAddress through and
-- populates it. Reports group/filter accordingly.

CREATE TABLE IF NOT EXISTS llm_usage (
  id                BIGSERIAL PRIMARY KEY,
  user_address      TEXT,
  task              TEXT NOT NULL
                     CHECK (task IN ('parse', 'disambig', 'summary', 'narration')),
  provider          TEXT NOT NULL,
  model             TEXT NOT NULL,
  prompt_tokens     INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd          NUMERIC(10, 6) NOT NULL DEFAULT 0,
  latency_ms        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- /admin/llm-usage/today aggregates and the SpendCap hydrate query both
-- filter by `date_trunc('day', created_at) = CURRENT_DATE`. A plain
-- (created_at) index is sufficient — Postgres uses it for the
-- date_trunc-equals-today range scan.
CREATE INDEX IF NOT EXISTS idx_llm_usage_created_at
  ON llm_usage (created_at DESC);

-- /admin/llm-usage/user/:address pulls the last N rows for a single user.
CREATE INDEX IF NOT EXISTS idx_llm_usage_user_created
  ON llm_usage (user_address, created_at DESC)
  WHERE user_address IS NOT NULL;

ALTER TABLE llm_usage ENABLE ROW LEVEL SECURITY;

-- Defense-in-depth: stage-1 connections use the service role (bypasses
-- RLS), but if a future surface ever connects with the anon key it should
-- only see its own rows.
DROP POLICY IF EXISTS llm_usage_user_read ON llm_usage;
CREATE POLICY llm_usage_user_read ON llm_usage
  FOR SELECT
  USING (user_address = current_setting('app.current_user_address', true));
