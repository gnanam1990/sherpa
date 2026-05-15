CREATE TABLE IF NOT EXISTS multisig_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address text NOT NULL UNIQUE,
  threshold int NOT NULL,
  chain_id int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS multisig_signers (
  wallet_id uuid REFERENCES multisig_wallets(id),
  signer_address text NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (wallet_id, signer_address)
);

CREATE TABLE IF NOT EXISTS multisig_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid REFERENCES multisig_wallets(id),
  to_address text NOT NULL,
  value numeric NOT NULL,
  data text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','executed','rejected')),
  confirmations int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  executed_at timestamptz
);

CREATE TABLE IF NOT EXISTS whitelisted_addresses (
  user_address text NOT NULL,
  whitelisted_address text NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_address, whitelisted_address)
);

CREATE INDEX idx_multisig_tx_wallet ON multisig_transactions(wallet_id, status);
CREATE INDEX idx_whitelist_user ON whitelisted_addresses(user_address);
