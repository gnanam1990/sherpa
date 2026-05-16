CREATE TABLE IF NOT EXISTS proposal_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('snapshot','aave','compound','optimism')),
  external_id text NOT NULL,
  space text,
  title text NOT NULL,
  description text,
  proposer text,
  status text NOT NULL DEFAULT 'active',
  choices jsonb,
  scores jsonb,
  quorum numeric,
  start_time timestamptz,
  end_time timestamptz,
  link text,
  raw jsonb NOT NULL DEFAULT '{}',
  cached_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source, external_id)
);

CREATE TABLE IF NOT EXISTS vote_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address text NOT NULL,
  source text NOT NULL CHECK (source IN ('snapshot','aave','compound','optimism')),
  proposal_external_id text NOT NULL,
  space text,
  choice text NOT NULL,
  weight numeric,
  reason text,
  tx_hash text,
  voted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_address, source, proposal_external_id)
);

CREATE TABLE IF NOT EXISTS delegation_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_address text NOT NULL,
  delegatee_address text NOT NULL,
  protocol text NOT NULL CHECK (protocol IN ('aave','compound','optimism')),
  chain_id int NOT NULL DEFAULT 1,
  tx_hash text,
  active boolean NOT NULL DEFAULT true,
  delegated_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE(delegator_address, protocol)
);

CREATE INDEX idx_proposal_cache_source ON proposal_cache(source, status);
CREATE INDEX idx_proposal_cache_space ON proposal_cache(space);
CREATE INDEX idx_vote_history_user ON vote_history(user_address);
CREATE INDEX idx_delegation_records_delegator ON delegation_records(delegator_address, active);
