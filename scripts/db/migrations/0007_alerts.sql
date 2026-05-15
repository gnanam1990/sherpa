CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address text NOT NULL,
  condition_type text NOT NULL CHECK (condition_type IN ('price','balance','health-factor')),
  asset jsonb,
  comparison text NOT NULL,
  threshold numeric NOT NULL,
  threshold_asset jsonb,
  notification_channels text[] NOT NULL DEFAULT '{push}',
  triggered_intent text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','triggered','completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_evaluated_at timestamptz,
  triggered_at timestamptz,
  trigger_count int NOT NULL DEFAULT 0,
  last_value numeric
);

CREATE INDEX idx_alerts_user_status ON alerts(user_address, status);
CREATE INDEX idx_alerts_eval ON alerts(status, last_evaluated_at);
