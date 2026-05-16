CREATE TABLE swap_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address TEXT NOT NULL,
    chain_id INTEGER NOT NULL DEFAULT 8453,
    token_in TEXT NOT NULL,
    token_out TEXT NOT NULL,
    amount_in NUMERIC NOT NULL,
    amount_out NUMERIC NOT NULL,
    fee_collected NUMERIC NOT NULL,
    tx_hash TEXT NOT NULL UNIQUE,
    builder_code TEXT NOT NULL,
    slippage_bps INTEGER NOT NULL,
    price_impact_bps INTEGER,
    route JSONB,
    block_number BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_swap_history_user ON swap_history(user_address, created_at DESC);
CREATE INDEX idx_swap_history_chain ON swap_history(chain_id, created_at DESC);
CREATE INDEX idx_swap_history_builder ON swap_history(builder_code, created_at DESC);
CREATE INDEX idx_swap_history_token_pair ON swap_history(token_in, token_out);
