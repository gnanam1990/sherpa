/**
 * Daily LLM spend circuit breaker.
 *
 * Per `docs/sherpa/SHERPA_COST_MODEL.md` Part 7, the build-phase hard cap is
 * **$50/day**. Better to fail loud than blow $5k overnight on a runaway loop.
 *
 * **Per-process limitation**: this counter lives in module-local state inside
 * a single Node process. If `apps/api` ever runs more than one worker (e.g.
 * a multi-instance Vercel deployment, or `pm2 cluster`), each worker holds
 * its own counter and the *effective* daily cap multiplies by the worker
 * count. On Vercel Hobby this is non-issue — one warm function instance per
 * region — but the moment we move to a horizontally-scaled deployment we
 * MUST swap this for a shared store. The Postgres-backed
 * `checkDailySpend()` sketched in the cost-model doc is that swap; it lands
 * once M3 wires `llm_usage`. The same `SpendCap` interface lets us swap
 * implementations without touching the router.
 *
 * Reset boundary is the UTC calendar day (matches the cost-model doc's
 * `CURRENT_DATE` semantics).
 */

export const DEFAULT_DAILY_CAP_USD = 50;

export class LLMSpendCapExceeded extends Error {
  constructor(
    public readonly spentUsd: number,
    public readonly capUsd: number,
  ) {
    super(
      `LLM spend cap exceeded: $${spentUsd.toFixed(4)} / $${capUsd.toFixed(2)} today`,
    );
    this.name = 'LLMSpendCapExceeded';
  }
}

export type SpendCap = {
  /**
   * Throws `LLMSpendCapExceeded` if day-to-date spend is at or over the cap.
   * Async-tolerant: the Postgres impl hydrates lazily on first call, so
   * callers must `await` even though the in-memory impl returns synchronously.
   */
  check(): void | Promise<void>;
  /** Record a completed call's USD cost. Returns the running daily total. */
  record(costUsd: number): number | Promise<number>;
  /** Current UTC-day spend. */
  spentToday(): number | Promise<number>;
  /** Configured cap for inspection. */
  capUsd(): number;
};

export type SpendCapConfig = {
  capUsd?: number;
  /** Injectable clock for tests. Defaults to `Date.now`. */
  now?: () => Date;
};

function utcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function createInMemorySpendCap(config: SpendCapConfig = {}): SpendCap {
  const cap = config.capUsd ?? DEFAULT_DAILY_CAP_USD;
  const now = config.now ?? (() => new Date());
  let day = utcDateKey(now());
  let spent = 0;

  function rollover() {
    const today = utcDateKey(now());
    if (today !== day) {
      day = today;
      spent = 0;
    }
  }

  return {
    check() {
      rollover();
      if (spent >= cap) throw new LLMSpendCapExceeded(spent, cap);
    },
    record(costUsd) {
      rollover();
      if (Number.isFinite(costUsd) && costUsd > 0) spent += costUsd;
      return spent;
    },
    spentToday() {
      rollover();
      return spent;
    },
    capUsd() {
      return cap;
    },
  };
}
