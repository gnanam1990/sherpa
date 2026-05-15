-- 0004_fid_smartwallet_link.sql — Sherpa Stage 3 P1 (Farcaster Mini App)
--
-- Maps Farcaster FIDs to Sherpa smart-wallet addresses.
-- One row per FID; upserts update the linked address and reset verified.
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS fid_smartwallet_links (
  fid                BIGINT PRIMARY KEY,
  smartwallet_address TEXT    NOT NULL,
  linked_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified            BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_fid_smartwallet_address
  ON fid_smartwallet_links (smartwallet_address);
