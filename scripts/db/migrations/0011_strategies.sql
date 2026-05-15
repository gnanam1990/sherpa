CREATE TABLE IF NOT EXISTS strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  creator_address text NOT NULL,
  chain_id int NOT NULL,
  intents jsonb NOT NULL DEFAULT '[]',
  parameters jsonb NOT NULL DEFAULT '{}',
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private','unlisted')),
  version int NOT NULL DEFAULT 1,
  followers int NOT NULL DEFAULT 0,
  total_volume numeric NOT NULL DEFAULT 0,
  success_rate numeric NOT NULL DEFAULT 100,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS strategy_followers (
  strategy_id uuid REFERENCES strategies(id),
  user_address text NOT NULL,
  parameters jsonb NOT NULL DEFAULT '{}',
  followed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (strategy_id, user_address)
);

CREATE TABLE IF NOT EXISTS strategy_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid REFERENCES strategies(id),
  user_address text NOT NULL,
  parameters jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  results jsonb NOT NULL DEFAULT '[]',
  executed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_strategies_creator ON strategies(creator_address);
CREATE INDEX idx_strategies_visibility ON strategies(visibility, followers DESC);
CREATE INDEX idx_strategy_executions_user ON strategy_executions(user_address, executed_at DESC);
