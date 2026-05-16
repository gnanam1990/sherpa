ALTER TABLE alerts ADD COLUMN IF NOT EXISTS params jsonb DEFAULT '{}';
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS one_shot boolean NOT NULL DEFAULT false;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS cooldown_seconds int NOT NULL DEFAULT 3600;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS last_triggered_at timestamptz;

CREATE TABLE IF NOT EXISTS alert_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  user_address text NOT NULL,
  condition_type text NOT NULL,
  evaluated_value numeric,
  threshold numeric,
  triggered boolean NOT NULL DEFAULT false,
  error text,
  evaluated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_alert_eval_alert ON alert_evaluations(alert_id, evaluated_at DESC);
CREATE INDEX idx_alert_eval_user ON alert_evaluations(user_address, evaluated_at DESC);
