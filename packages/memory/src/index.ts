/**
 * @sherpa/memory — audit log wrapper, rate limiter, history (M3 ownership).
 *
 * M1 writes to the audit log via `createAuditLog` / `updateAuditLog` only —
 * never INSERTs directly. See M1_BACKEND_PACK §4.
 */

import type { SherpaConfig } from '@sherpa/config';
import { getPool } from '@sherpa/config';
import { createInMemorySpendCap, type SpendCap } from '@sherpa/llm';
import { createInMemoryAuditStore, type AuditStore } from './audit.js';
import { createPostgresAuditStore } from './audit.postgres.js';
import { createPostgresSpendCap } from './spend-cap.postgres.js';
import { createPostgresUsageSink, type UsageSink } from './llm-usage.postgres.js';

export * from './audit.js';
export * from './audit.postgres.js';
export * from './ratelimit.js';
export * from './spend-cap.postgres.js';
export * from './llm-usage.postgres.js';
export * from './llm-usage.reports.js';

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

/**
 * Pick the right SpendCap impl based on config flags.
 *
 * Mirrors `createAuditStore`. Lives in `@sherpa/memory` (not `@sherpa/llm`)
 * to avoid a dep cycle: @sherpa/memory already imports the SpendCap
 * interface from @sherpa/llm, so the dispatch must live downstream of
 * both.
 *
 * - `useRealDb=false` (default) — in-memory; safe for tests, local dev, CI.
 * - `useRealDb=true` — Postgres-backed; requires `databaseUrl`. Hydrates
 *   today's spend from `llm_usage` on first call.
 */
export function createSpendCap(
  config: Pick<SherpaConfig, 'useRealDb' | 'databaseUrl'>,
): SpendCap {
  if (!config.useRealDb) return createInMemorySpendCap();
  const pool = getPool(config);
  return createPostgresSpendCap(pool);
}

/**
 * Pick the right UsageSink impl. Returns `undefined` in the in-memory
 * mode — callers (router via `onUsage`) treat undefined as "no-op", so
 * dev/test runs don't try to write to a non-existent `llm_usage` table.
 */
export function createUsageSink(
  config: Pick<SherpaConfig, 'useRealDb' | 'databaseUrl'>,
): UsageSink | undefined {
  if (!config.useRealDb) return undefined;
  const pool = getPool(config);
  return createPostgresUsageSink(pool);
}
