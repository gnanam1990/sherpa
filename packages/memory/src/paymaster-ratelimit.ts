/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 * Paymaster per-address rate limiter.
 *
 * Fixed 24h window anchored on the first sponsored UserOp from a given
 * `user_address` (lowercased hex). The window rolls forward only after
 * NOW() - window_start > 24h. Stage 1 limit is 3 sponsored ops per
 * window — chosen because the build-phase Coinbase budget is ~$50/day
 * and a single user with no per-user cap could drain that in minutes.
 *
 * Two implementations: in-memory (default, dev/test) and Postgres
 * (production, when `useRealDb=true`). `createPaymasterRateLimiter`
 * picks the right one — same shape as `createAuditStore`.
 *
 * Multi-instance correctness: identical to spend-cap.postgres — between
 * roundtrips two instances may each independently increment from the
 * same observed count, so the effective cap is (limit × instances) in
 * the worst case. Acceptable for Stage 1; if/when we scale horizontally
 * the row read/write becomes a single CTE under serializable isolation,
 * or moves into Redis.
 *
 * `refund()` is called when an upstream paymaster RPC returns 5xx or
 * the network call throws — we don't want a Coinbase outage to consume
 * a user's daily sponsorship budget.
 */

import type pg from 'pg';
import type { SherpaConfig } from '@sherpa/config';
import { getPool, query } from '@sherpa/config';

export const PAYMASTER_DEFAULT_LIMIT = 3;
export const PAYMASTER_DEFAULT_WINDOW_MS = 24 * 60 * 60 * 1000;

export type PaymasterConsumeResult =
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; remaining: 0; resetAt: number };

export interface PaymasterRateLimiter {
  consume(userAddress: string): Promise<PaymasterConsumeResult>;
  refund(userAddress: string): Promise<void>;
  /** Configured per-window limit. Exposed so callers (route handler)
   *  can build accurate `remaining N of M` headers without a magic number. */
  limit(): number;
  /** Test/admin escape hatch. */
  reset?(userAddress?: string): Promise<void>;
}

export type PaymasterRateLimiterConfig = {
  limit?: number;
  windowMs?: number;
  /** Injectable clock for tests. */
  now?: () => number;
};

export function createInMemoryPaymasterRateLimiter(
  config: PaymasterRateLimiterConfig = {},
): PaymasterRateLimiter {
  const limit = config.limit ?? PAYMASTER_DEFAULT_LIMIT;
  const windowMs = config.windowMs ?? PAYMASTER_DEFAULT_WINDOW_MS;
  const now = config.now ?? (() => Date.now());
  const buckets = new Map<string, { count: number; windowStartMs: number }>();

  return {
    async consume(addr) {
      const key = addr.toLowerCase();
      const t = now();
      const bucket = buckets.get(key);
      if (!bucket || t - bucket.windowStartMs > windowMs) {
        buckets.set(key, { count: 1, windowStartMs: t });
        return { ok: true, remaining: limit - 1, resetAt: t + windowMs };
      }
      const resetAt = bucket.windowStartMs + windowMs;
      if (bucket.count >= limit) {
        return { ok: false, remaining: 0, resetAt };
      }
      bucket.count += 1;
      return { ok: true, remaining: limit - bucket.count, resetAt };
    },
    async refund(addr) {
      const key = addr.toLowerCase();
      const bucket = buckets.get(key);
      if (!bucket) return;
      bucket.count = Math.max(0, bucket.count - 1);
    },
    async reset(addr) {
      if (addr === undefined) buckets.clear();
      else buckets.delete(addr.toLowerCase());
    },
    limit() {
      return limit;
    },
  };
}

/**
 * Postgres-backed limiter. Two roundtrips per consume() in the warm
 * case: a SELECT, then a single-row UPDATE (or INSERT-on-no-row). We
 * deliberately don't pack this into a CTE — the spend-cap.postgres
 * read-modify-write pattern is the codebase precedent, and a CTE that
 * conditionally increments hides the "denied vs consumed" decision in
 * SQL where it's harder to unit-test.
 */
export function createPostgresPaymasterRateLimiter(
  pool: pg.Pool,
  config: PaymasterRateLimiterConfig = {},
): PaymasterRateLimiter {
  const limit = config.limit ?? PAYMASTER_DEFAULT_LIMIT;
  const windowMs = config.windowMs ?? PAYMASTER_DEFAULT_WINDOW_MS;

  return {
    async consume(addr) {
      const key = addr.toLowerCase();
      const sel = await query<{ count: number | string; window_start: Date }>(
        pool,
        `SELECT count, window_start
           FROM paymaster_ratelimit
          WHERE user_address = $1`,
        [key],
      );
      const row = sel.rows[0];
      const nowMs = Date.now();
      if (!row) {
        // First-ever call for this address — ON CONFLICT guards the rare
        // race where two requests insert concurrently.
        await query(
          pool,
          `INSERT INTO paymaster_ratelimit (user_address, count, window_start)
           VALUES ($1, 1, date_trunc('milliseconds', NOW()))
           ON CONFLICT (user_address) DO UPDATE
             SET count = 1,
                 window_start = date_trunc('milliseconds', NOW())`,
          [key],
        );
        return { ok: true, remaining: limit - 1, resetAt: nowMs + windowMs };
      }
      const windowStartMs = row.window_start.getTime();
      const expired = nowMs - windowStartMs > windowMs;
      if (expired) {
        await query(
          pool,
          `UPDATE paymaster_ratelimit
              SET count = 1,
                  window_start = date_trunc('milliseconds', NOW())
            WHERE user_address = $1`,
          [key],
        );
        return { ok: true, remaining: limit - 1, resetAt: nowMs + windowMs };
      }
      const currentCount = Number(row.count);
      const resetAt = windowStartMs + windowMs;
      if (currentCount >= limit) {
        return { ok: false, remaining: 0, resetAt };
      }
      await query(
        pool,
        `UPDATE paymaster_ratelimit
            SET count = count + 1
          WHERE user_address = $1`,
        [key],
      );
      return { ok: true, remaining: limit - currentCount - 1, resetAt };
    },
    async refund(addr) {
      const key = addr.toLowerCase();
      await query(
        pool,
        `UPDATE paymaster_ratelimit
            SET count = GREATEST(count - 1, 0)
          WHERE user_address = $1`,
        [key],
      );
    },
    limit() {
      return limit;
    },
  };
}

/**
 * Pick the right PaymasterRateLimiter implementation based on config
 * flags. Mirrors `createAuditStore` / `createSpendCap` / `createUsageSink`.
 */
export function createPaymasterRateLimiter(
  config: Pick<SherpaConfig, 'useRealDb' | 'databaseUrl'>,
  options: PaymasterRateLimiterConfig = {},
): PaymasterRateLimiter {
  if (!config.useRealDb) return createInMemoryPaymasterRateLimiter(options);
  const pool = getPool(config);
  return createPostgresPaymasterRateLimiter(pool, options);
}
