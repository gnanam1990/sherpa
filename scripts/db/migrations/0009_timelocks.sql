CREATE TABLE IF NOT EXISTS time_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address text NOT NULL,
  action_type text NOT NULL,
  action_params jsonb NOT NULL,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','executed','failed','cancelled')),
  executed_at timestamptz,
  tx_hash text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_timelocks_status ON time_locks(status, scheduled_at);
CREATE INDEX idx_timelocks_user ON time_locks(user_address, status);
