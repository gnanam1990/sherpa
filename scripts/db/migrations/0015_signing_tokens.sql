CREATE TABLE IF NOT EXISTS signing_tokens (
  token text PRIMARY KEY,
  surface text NOT NULL CHECK (surface IN ('telegram','farcaster','web')),
  surface_user_id text NOT NULL,
  intent_payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  resulting_tx_hash text
);

CREATE INDEX IF NOT EXISTS idx_signing_tokens_expires 
  ON signing_tokens(expires_at) WHERE consumed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_signing_tokens_surface_user 
  ON signing_tokens(surface, surface_user_id);
