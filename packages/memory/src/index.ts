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
import {
  createPostgresNotificationStore,
  InMemoryNotificationStore,
  type NotificationStore,
} from './notifications.js';
import {
  createPostgresAlertStore,
  InMemoryAlertStore,
  type AlertStore,
} from './alerts.js';
import {
  createPostgresDCAStore,
  InMemoryDCAStore,
  type DCAStore,
} from './dca.js';
import {
  createPostgresAutoRepayStore,
  InMemoryAutoRepayStore,
  type AutoRepayStore,
} from './auto-repay.js';
import {
  InMemorySessionKeyStore,
  PostgresSessionKeyStore,
  type SessionKeyStore,
} from './session-keys.js';

export * from './audit.js';
export * from './audit.postgres.js';
export * from './ratelimit.js';
export * from './spend-cap.postgres.js';
export * from './llm-usage.postgres.js';
export * from './llm-usage.reports.js';
export * from './paymaster-ratelimit.js';
export * from './alerts.js';
export * from './session-keys.js';
export * from './strategies.js';
export * from './notifications.js';
export * from './surface-links.js';
export * from './notification-tokens.js';
export * from './swap-history.js';
export * from './lending-positions.js';
export * from './borrow-positions.js';
export * from './aave-health-log.js';
export * from './dca.js';
export * from './auto-repay.js';
export * from './governance.js';
export * from './portfolio-snapshots.js';

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

/**
 * Pick the right NotificationStore implementation. This keeps API route
 * modules stateless in production while preserving isolated in-memory
 * behavior for tests and local runs.
 */
export function createNotificationStore(
  config: Pick<SherpaConfig, 'useRealDb' | 'databaseUrl'>,
): NotificationStore {
  if (!config.useRealDb) return new InMemoryNotificationStore();
  const pool = getPool(config);
  return createPostgresNotificationStore(pool);
}

/**
 * Pick the right AlertStore implementation. Production workers and API
 * routes must share the Postgres-backed store so active alerts survive
 * process restarts and are visible to the background evaluator.
 */
export function createAlertStore(
  config: Pick<SherpaConfig, 'useRealDb' | 'databaseUrl'>,
): AlertStore {
  if (!config.useRealDb) return new InMemoryAlertStore();
  const pool = getPool(config);
  return createPostgresAlertStore(pool);
}

/**
 * Pick the right DCAStore implementation. DCA execution is intentionally
 * fail-closed until a session-key executor is configured, but schedules and
 * failed attempts still need durable storage in production.
 */
export function createDCAStore(
  config: Pick<SherpaConfig, 'useRealDb' | 'databaseUrl'>,
): DCAStore {
  if (!config.useRealDb) return new InMemoryDCAStore();
  const pool = getPool(config);
  return createPostgresDCAStore(pool);
}

/**
 * Pick the right AutoRepayStore implementation. Auto-repay rules are durable
 * in production; execution remains fail-closed unless explicit tx builder and
 * broadcaster dependencies are provided.
 */
export function createAutoRepayStore(
  config: Pick<SherpaConfig, 'useRealDb' | 'databaseUrl'>,
): AutoRepayStore {
  if (!config.useRealDb) return new InMemoryAutoRepayStore();
  const pool = getPool(config);
  return createPostgresAutoRepayStore(pool);
}

/**
 * Pick the right SessionKeyStore implementation. This stores user-granted
 * session-key metadata only. Actual unattended signing remains a separate
 * fail-closed worker dependency.
 */
export function createSessionKeyStore(
  config: Pick<SherpaConfig, 'useRealDb' | 'databaseUrl'>,
): SessionKeyStore {
  if (!config.useRealDb) return new InMemorySessionKeyStore();
  const pool = getPool(config);
  return new PostgresSessionKeyStore(pool);
}
