/**
 * @sherpa/memory — audit log wrapper, rate limiter, history (M3 ownership).
 *
 * M1 writes to the audit log via `createAuditLog` / `updateAuditLog` only —
 * never INSERTs directly. See M1_BACKEND_PACK §4.
 */

import type { SherpaConfig } from '@sherpa/config';
import { getPool } from '@sherpa/config';
import { createInMemoryAuditStore, type AuditStore } from './audit.js';
import { createPostgresAuditStore } from './audit.postgres.js';

export * from './audit.js';
export * from './audit.postgres.js';
export * from './ratelimit.js';

/**
 * Pick the right AuditStore implementation based on config flags.
 *
 * - `useRealDb=false` (default) — in-memory; safe for tests, local dev, CI.
 * - `useRealDb=true` — Postgres-backed; requires `databaseUrl`.
 */
export function createAuditStore(
  config: Pick<SherpaConfig, 'useRealDb' | 'databaseUrl'>,
): AuditStore {
  if (!config.useRealDb) return createInMemoryAuditStore();
  const pool = getPool(config);
  return createPostgresAuditStore(pool);
}
