CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  onchain_id text,
  title text NOT NULL,
  description text,
  proposer_address text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','passed','rejected','executed')),
  votes_for numeric NOT NULL DEFAULT 0,
  votes_against numeric NOT NULL DEFAULT 0,
  votes_abstain numeric NOT NULL DEFAULT 0,
  quorum numeric NOT NULL DEFAULT 0,
  start_time timestamptz,
  end_time timestamptz,
  execution_time timestamptz,
  actions jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES proposals(id),
  voter_address text NOT NULL,
  support text NOT NULL CHECK (support IN ('yes','no','abstain')),
  weight numeric NOT NULL,
  reason text,
  voted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(proposal_id, voter_address)
);

CREATE TABLE IF NOT EXISTS delegations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_address text NOT NULL,
  delegatee_address text NOT NULL,
  chain_id int NOT NULL,
  delegated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(delegator_address, chain_id)
);

CREATE INDEX idx_proposals_status ON proposals(status, end_time);
CREATE INDEX idx_votes_proposal ON votes(proposal_id, support);
CREATE INDEX idx_delegations_delegator ON delegations(delegator_address);
