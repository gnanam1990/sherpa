import type pg from 'pg';
import { query } from '@sherpa/config';

export async function saveNotificationToken(
  pool: pg.Pool,
  fid: bigint,
  token: string,
  url: string,
  client: string,
): Promise<void> {
  await query(
    pool,
    `INSERT INTO notification_tokens (fid, token, url, client, created_at, active)
     VALUES ($1, $2, $3, $4, date_trunc('milliseconds', NOW()), true)
     ON CONFLICT (fid) DO UPDATE
       SET token = $2, url = $3, client = $4,
           created_at = date_trunc('milliseconds', NOW()),
           active = true`,
    [fid.toString(), token, url, client],
  );
}

export async function deactivateNotificationTokens(pool: pg.Pool, fid: bigint): Promise<void> {
  await query(pool, 'UPDATE notification_tokens SET active = false WHERE fid = $1', [
    fid.toString(),
  ]);
}

export async function listActiveTokens(
  pool: pg.Pool,
): Promise<Array<{ fid: string; token: string; url: string; client: string }>> {
  const res = await query<{ fid: string; token: string; url: string; client: string }>(
    pool,
    'SELECT fid, token, url, client FROM notification_tokens WHERE active = true',
  );
  return res.rows;
}
