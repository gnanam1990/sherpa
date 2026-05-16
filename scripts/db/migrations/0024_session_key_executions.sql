-- Add scope/limits columns to session_keys and calldata/gas_used to executions
-- These columns support the full permission model and execution tracking.

ALTER TABLE session_keys
  ADD COLUMN IF NOT EXISTS scope jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS limits jsonb NOT NULL DEFAULT '{}';

ALTER TABLE session_key_executions
  ADD COLUMN IF NOT EXISTS calldata text,
  ADD COLUMN IF NOT EXISTS gas_used numeric;

-- Down migration (run manually if needed):
-- ALTER TABLE session_keys DROP COLUMN IF EXISTS scope, DROP COLUMN IF EXISTS limits;
-- ALTER TABLE session_key_executions DROP COLUMN IF EXISTS calldata, DROP COLUMN IF EXISTS gas_used;
