CREATE TABLE IF NOT EXISTS dca_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address text NOT NULL,
  from_asset jsonb NOT NULL,
  to_asset jsonb NOT NULL,
  amount_per_tick numeric NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('daily','weekly','monthly')),
  day_of_week int,
  day_of_month int,
  hour_of_day int NOT NULL DEFAULT 12,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed')),
  total_budget numeric,
  remaining_budget numeric,
  total_executions int NOT NULL DEFAULT 0,
  max_executions int,
  created_at timestamptz NOT NULL DEFAULT now(),
  next_execution_at timestamptz NOT NULL,
  last_executed_at timestamptz
);

CREATE TABLE IF NOT EXISTS dca_execution_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES dca_schedules(id),
  executed_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL,
  tx_hash text,
  error_message text
);

CREATE INDEX idx_dca_user_status ON dca_schedules(user_address, status);
CREATE INDEX idx_dca_next_exec ON dca_schedules(status, next_execution_at);
