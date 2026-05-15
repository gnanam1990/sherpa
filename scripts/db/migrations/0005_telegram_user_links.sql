-- 0005_telegram_user_links.sql — Sherpa Stage 3 P2 (Telegram Bot)
--
-- Maps Telegram user IDs to Sherpa smart-wallet addresses.
-- One row per Telegram user; upserts update the linked address and reset verified.
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS telegram_user_links (
  tg_user_id          BIGINT PRIMARY KEY,
  smartwallet_address TEXT    NOT NULL,
  linked_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified            BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_tg_smartwallet_address
  ON telegram_user_links (smartwallet_address);
