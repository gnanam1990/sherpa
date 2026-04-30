export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Fixed-window rate limiter, in-memory. Replaced by Redis in Stage 2.
 */
export interface RateLimiter {
  check(key: string, limit: number, windowSec: number): Promise<RateLimitResult>;
  reset(key?: string): void;
}

export function createInMemoryRateLimiter(now: () => number = () => Date.now()): RateLimiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return {
    async check(key, limit, windowSec) {
      const t = now();
      const bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= t) {
        const resetAt = t + windowSec * 1000;
        buckets.set(key, { count: 1, resetAt });
        return { ok: true, remaining: limit - 1, resetAt };
      }
      if (bucket.count >= limit) {
        return { ok: false, remaining: 0, resetAt: bucket.resetAt };
      }
      bucket.count += 1;
      return { ok: true, remaining: limit - bucket.count, resetAt: bucket.resetAt };
    },
    reset(key) {
      if (key === undefined) buckets.clear();
      else buckets.delete(key);
    },
  };
}
