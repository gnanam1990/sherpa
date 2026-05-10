/**
 * Postgres-backed daily spend circuit breaker.
 *
 * Hydrates from `SELECT SUM(cost_usd)` over today's `llm_usage` rows on
 * first `check()` / `record()` / `spentToday()`, then caches the running
 * total in-memory. Subsequent `record(cost)` increments the cached total
 * without an extra roundtrip — the row INSERT itself is the
 * `createPostgresUsageSink` callback's responsibility, not this one's.
 *
 * The split (cap counter ≠ row writer) lets the router's `record(cost)`
 * stay narrow while the `onUsage` hook captures the rich metadata
 * (task, model, user_address, latency_ms) the reporting endpoints need.
 *
 * `date_trunc('day', created_at) = date_trunc('day', NOW())` mirrors
 * the cost-model doc and keeps the comparison entirely server-side, so
 * no JS Date round-trip can introduce the µs/ms truncation bug PR #10's
 * audit_log update path tripped on.
 *
 * Multi-instance correctness: each instance hydrates accurately on cold
 * start, but between hydrates instances only see their own `record()`
 * increments. Effective cap is therefore (cap × instances) in the worst
 * case. Acceptable for the $50/day build-phase soft limit. If/when we
 * scale horizontally we either re-hydrate per-call (slow but correct) or
 * move the counter into Redis.
 */

import type pg from 'pg';
import { query } from '@sherpa/config';
import {
  DEFAULT_DAILY_CAP_USD,
  LLMSpendCapExceeded,
  type SpendCap,
} from '@sherpa/llm';

export type PostgresSpendCapConfig = {
  capUsd?: number;
  /** Injectable clock for tests. Defaults to `new Date()`. */
  now?: () => Date;
};

function utcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function createPostgresSpendCap(
  pool: pg.Pool,
  config: PostgresSpendCapConfig = {},
): SpendCap {
  const cap = config.capUsd ?? DEFAULT_DAILY_CAP_USD;
  const now = config.now ?? (() => new Date());
  let day = utcDateKey(now());
  let spent: number | null = null; // null = not yet hydrated for `day`

  async function hydrate(): Promise<void> {
    const today = utcDateKey(now());
    if (spent !== null && today === day) return;
    day = today;
    const res = await query<{ total: string | number | null }>(
      pool,
      `SELECT COALESCE(SUM(cost_usd), 0) AS total
         FROM llm_usage
        WHERE date_trunc('day', created_at) = date_trunc('day', NOW())`,
    );
    const raw = res.rows[0]?.total ?? 0;
    spent = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(spent)) spent = 0;
  }

  return {
    async check(): Promise<void> {
      await hydrate();
      const s = spent ?? 0;
      if (s >= cap) throw new LLMSpendCapExceeded(s, cap);
    },
    async record(costUsd: number): Promise<number> {
      await hydrate();
      if (Number.isFinite(costUsd) && costUsd > 0) spent = (spent ?? 0) + costUsd;
      return spent ?? 0;
    },
    async spentToday(): Promise<number> {
      await hydrate();
      return spent ?? 0;
    },
    capUsd() {
      return cap;
    },
  };
}
