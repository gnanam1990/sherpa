/**
 * Postgres pool + typed query helper for Sherpa (M3 ownership).
 *
 * Connections target Supabase's transaction-mode pooler (port 6543). Vercel
 * functions are short-lived and may run many concurrent instances, so each
 * instance keeps a tiny pool (max 1) — pgbouncer multiplexes underneath. A
 * larger pool here would exhaust Supabase's free-tier connection limit
 * during bursts.
 *
 * NEVER interpolate values into SQL strings. Use parameterized queries —
 * `query<T>('SELECT ... WHERE id = $1', [id])`.
 */

import pg from 'pg';
import type { SherpaConfig } from './index.js';

export type DbPool = pg.Pool;

export type QueryResult<T> = {
  rows: T[];
  rowCount: number;
};

const QUERY_DEADLINE_MS = 50_000;

let cachedPool: pg.Pool | undefined;

export function getPool(config: Pick<SherpaConfig, 'databaseUrl' | 'useRealDb'>): pg.Pool {
  if (!config.useRealDb) {
    throw new Error('[config] getPool() called with SHERPA_USE_REAL_DB=false');
  }
  if (!config.databaseUrl) {
    throw new Error('[config] DATABASE_URL is required when SHERPA_USE_REAL_DB=true');
  }
  if (!cachedPool) {
    cachedPool = new pg.Pool({
      connectionString: config.databaseUrl,
      max: 1,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      statement_timeout: QUERY_DEADLINE_MS,
    });
  }
  return cachedPool;
}

/** Reset the cached pool. Tests only. */
export async function resetPool(): Promise<void> {
  if (cachedPool) {
    await cachedPool.end();
    cachedPool = undefined;
  }
}

export async function query<T extends pg.QueryResultRow>(
  pool: pg.Pool,
  sql: string,
  params: readonly unknown[] = [],
): Promise<QueryResult<T>> {
  const res = await pool.query<T>(sql, params as unknown[]);
  return { rows: res.rows, rowCount: res.rowCount ?? 0 };
}
