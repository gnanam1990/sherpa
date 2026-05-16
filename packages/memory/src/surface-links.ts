import type pg from 'pg';
import { query } from '@sherpa/config';
import { randomBytes } from 'node:crypto';

export async function linkFarcasterFid(
  pool: pg.Pool,
  fid: bigint,
  address: `0x${string}`,
  verified: boolean = false,
): Promise<void> {
  await query(
    pool,
    `INSERT INTO fid_smartwallet_links (fid, smartwallet_address, linked_at, verified)
     VALUES ($1, $2, date_trunc('milliseconds', NOW()), $3)
     ON CONFLICT (fid) DO UPDATE
       SET smartwallet_address = $2,
           linked_at = date_trunc('milliseconds', NOW()),
           verified = $3`,
    [fid.toString(), address.toLowerCase(), verified],
  );
}

export async function getFarcasterLink(
  pool: pg.Pool,
  fid: bigint,
): Promise<{ address: `0x${string}`; verified: boolean } | null> {
  const res = await query<{ smartwallet_address: string; verified: boolean }>(
    pool,
    'SELECT smartwallet_address, verified FROM fid_smartwallet_links WHERE fid = $1',
    [fid.toString()],
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    address: row.smartwallet_address.toLowerCase() as `0x${string}`,
    verified: row.verified,
  };
}

export async function linkTelegramUser(
  pool: pg.Pool,
  tgUserId: bigint,
  address: `0x${string}`,
  verified: boolean = false,
): Promise<void> {
  await query(
    pool,
    `INSERT INTO telegram_user_links (tg_user_id, smartwallet_address, linked_at, verified)
     VALUES ($1, $2, date_trunc('milliseconds', NOW()), $3)
     ON CONFLICT (tg_user_id) DO UPDATE
       SET smartwallet_address = $2,
           linked_at = date_trunc('milliseconds', NOW()),
           verified = $3`,
    [tgUserId.toString(), address.toLowerCase(), verified],
  );
}

export async function getTelegramLink(
  pool: pg.Pool,
  tgUserId: bigint,
): Promise<{ address: `0x${string}`; verified: boolean } | null> {
  const res = await query<{ smartwallet_address: string; verified: boolean }>(
    pool,
    'SELECT smartwallet_address, verified FROM telegram_user_links WHERE tg_user_id = $1',
    [tgUserId.toString()],
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    address: row.smartwallet_address.toLowerCase() as `0x${string}`,
    verified: row.verified,
  };
}

export async function createSigningToken(
  pool: pg.Pool,
  params: {
    surface: 'telegram' | 'farcaster' | 'web';
    surfaceUserId: string;
    intentPayload: unknown;
    ttlSeconds?: number;
  },
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('hex');
  const ttl = params.ttlSeconds ?? 300;
  const expiresAt = new Date(Date.now() + ttl * 1000);
  await query(
    pool,
    `INSERT INTO signing_tokens (token, surface, surface_user_id, intent_payload, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [token, params.surface, params.surfaceUserId, JSON.stringify(params.intentPayload), expiresAt],
  );
  return { token, expiresAt };
}

export async function getSigningToken(
  pool: pg.Pool,
  token: string,
): Promise<{
  surface: string;
  surfaceUserId: string;
  intentPayload: unknown;
  expiresAt: Date;
  consumed: boolean;
} | null> {
  const res = await query<{
    surface: string;
    surface_user_id: string;
    intent_payload: unknown;
    expires_at: Date;
    consumed_at: Date | null;
  }>(
    pool,
    'SELECT surface, surface_user_id, intent_payload, expires_at, consumed_at FROM signing_tokens WHERE token = $1',
    [token],
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    surface: row.surface,
    surfaceUserId: row.surface_user_id,
    intentPayload: row.intent_payload,
    expiresAt: row.expires_at,
    consumed: row.consumed_at !== null,
  };
}

export async function consumeSigningToken(
  pool: pg.Pool,
  token: string,
  txHash: string,
): Promise<void> {
  const res = await query(
    pool,
    `UPDATE signing_tokens
     SET consumed_at = date_trunc('milliseconds', NOW()), resulting_tx_hash = $2
     WHERE token = $1 AND consumed_at IS NULL`,
    [token, txHash],
  );
  if (res.rowCount === 0) {
    throw new Error(`[memory] signing token ${token} not found or already consumed`);
  }
}

export async function unlinkTelegramUser(pool: pg.Pool, tgUserId: bigint): Promise<boolean> {
  const res = await query(pool, 'DELETE FROM telegram_user_links WHERE tg_user_id = $1', [
    tgUserId.toString(),
  ]);
  return (res.rowCount ?? 0) > 0;
}
