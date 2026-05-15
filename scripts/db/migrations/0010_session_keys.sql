CREATE TABLE IF NOT EXISTS session_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_address text NOT NULL,
  session_key_address text NOT NULL,
  chain_id int NOT NULL,
  permissions jsonb NOT NULL DEFAULT '[]',
  spend_limit numeric NOT NULL,
  spent_amount numeric NOT NULL DEFAULT 0,
  valid_from timestamptz NOT NULL,
  valid_until timestamptz NOT NULL,
  max_executions int NOT NULL DEFAULT 1000,
  execution_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','revoked','exhausted')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS session_key_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key_id uuid REFERENCES session_keys(id),
  target text NOT NULL,
  selector text NOT NULL,
  value numeric NOT NULL,
  tx_hash text,
  status text NOT NULL,
  executed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_session_keys_owner ON session_keys(owner_address, status);
CREATE INDEX idx_session_keys_valid ON session_keys(status, valid_until);
