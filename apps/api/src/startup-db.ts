/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { getPool, query, type SherpaConfig } from '@sherpa/config';
import type { Logger } from '@sherpa/logger';

const SURFACE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS fid_smartwallet_links (
  fid                  BIGINT PRIMARY KEY,
  smartwallet_address  TEXT NOT NULL,
  linked_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified             BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_fid_smartwallet_address
  ON fid_smartwallet_links (smartwallet_address);

CREATE TABLE IF NOT EXISTS telegram_user_links (
  tg_user_id           BIGINT PRIMARY KEY,
  smartwallet_address  TEXT NOT NULL,
  linked_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified             BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_tg_smartwallet_address
  ON telegram_user_links (smartwallet_address);

CREATE TABLE IF NOT EXISTS signing_tokens (
  token               TEXT PRIMARY KEY,
  surface             TEXT NOT NULL CHECK (surface IN ('telegram','farcaster','web','mcp')),
  surface_user_id     TEXT NOT NULL,
  intent_payload      JSONB NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ NOT NULL,
  consumed_at         TIMESTAMPTZ,
  resulting_tx_hash   TEXT
);

-- Widen the surface CHECK to include 'mcp' on already-provisioned databases
-- (CREATE TABLE IF NOT EXISTS above only applies to fresh schemas). Postgres
-- auto-names the inline single-column check signing_tokens_surface_check.
ALTER TABLE signing_tokens DROP CONSTRAINT IF EXISTS signing_tokens_surface_check;
ALTER TABLE signing_tokens ADD CONSTRAINT signing_tokens_surface_check
  CHECK (surface IN ('telegram','farcaster','web','mcp'));

CREATE INDEX IF NOT EXISTS idx_signing_tokens_expires
  ON signing_tokens (expires_at) WHERE consumed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_signing_tokens_surface_user
  ON signing_tokens (surface, surface_user_id);

CREATE TABLE IF NOT EXISTS notification_tokens (
  fid         BIGINT PRIMARY KEY,
  token       TEXT NOT NULL,
  url         TEXT NOT NULL,
  client      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active      BOOLEAN NOT NULL DEFAULT true
);
`;

export async function ensureSurfaceSchema(config: SherpaConfig, log: Logger): Promise<void> {
  if (!config.useRealDb) return;
  const pool = getPool(config);
  await query(pool, SURFACE_SCHEMA_SQL);
  log.info('surface schema ensured');
}
