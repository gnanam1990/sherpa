ALTER TABLE auto_repay_rules ADD COLUMN IF NOT EXISTS max_per_day int NOT NULL DEFAULT 5;
