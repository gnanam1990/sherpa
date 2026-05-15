CREATE TABLE IF NOT EXISTS auto_repay_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address text NOT NULL,
  trigger_hf int NOT NULL, -- basis points
  target_hf int NOT NULL,
  max_repay_per_execution numeric NOT NULL,
  repay_source text[] NOT NULL DEFAULT '{usdc}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','disabled')),
  consecutive_failures int NOT NULL DEFAULT 0,
  total_repayments int NOT NULL DEFAULT 0,
  total_repaid_usd numeric NOT NULL DEFAULT 0,
  authorization_tx_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_evaluated_at timestamptz,
  last_triggered_at timestamptz
);

CREATE TABLE IF NOT EXISTS auto_repay_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES auto_repay_rules(id),
  executed_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL,
  hf_before int,
  hf_after int,
  amount_repaid numeric,
  tx_hash text,
  error_message text
);

CREATE INDEX idx_auto_repay_active ON auto_repay_rules(status, last_evaluated_at);
