CREATE TABLE lending_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address TEXT NOT NULL,
    chain_id INTEGER NOT NULL DEFAULT 8453,
    asset TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('supply', 'withdraw')),
    amount NUMERIC NOT NULL,
    atoken_received NUMERIC,
    underlying_returned NUMERIC,
    apy_at_time NUMERIC,
    tx_hash TEXT NOT NULL UNIQUE,
    builder_code TEXT NOT NULL,
    block_number BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lending_positions_user ON lending_positions(user_address, created_at DESC);
CREATE INDEX idx_lending_positions_asset ON lending_positions(asset);
