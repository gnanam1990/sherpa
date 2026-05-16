CREATE TABLE aave_health_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address TEXT NOT NULL,
    chain_id INTEGER NOT NULL DEFAULT 8453,
    health_factor NUMERIC NOT NULL,
    total_collateral_base NUMERIC NOT NULL,
    total_debt_base NUMERIC NOT NULL,
    available_borrows_base NUMERIC,
    ltv NUMERIC,
    liquidation_threshold NUMERIC,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_aave_health_user_time ON aave_health_log(user_address, recorded_at DESC);
CREATE INDEX idx_aave_health_critical ON aave_health_log(recorded_at DESC) WHERE health_factor < 1.5;
