CREATE TABLE borrow_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address TEXT NOT NULL,
    chain_id INTEGER NOT NULL DEFAULT 8453,
    asset TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('borrow', 'repay')),
    amount NUMERIC NOT NULL,
    rate_mode INTEGER NOT NULL CHECK (rate_mode IN (1, 2)),
    apy_at_time NUMERIC,
    health_factor_before NUMERIC,
    health_factor_after NUMERIC,
    tx_hash TEXT NOT NULL UNIQUE,
    builder_code TEXT NOT NULL,
    block_number BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_borrow_positions_user ON borrow_positions(user_address, created_at DESC);
CREATE INDEX idx_borrow_positions_asset ON borrow_positions(asset);
