/**
 * Daily LLM spend circuit breaker.
 *
 * Per `docs/sherpa/SHERPA_COST_MODEL.md` Part 7, the build-phase hard cap is
 * **$50/day**. Better to fail loud than blow $5k overnight on a runaway loop.
 *
 * This module ships an in-memory counter; the Postgres-backed
 * `checkDailySpend()` sketched in the cost-model doc lands once M3 wires
 * `llm_usage`. Until then, the same `SpendCap` interface lets us swap the
 * implementation without touching the router.
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
  /** Throws `LLMSpendCapExceeded` if day-to-date spend is at or over the cap. */
  check(): void;
  /** Record a completed call's USD cost. Returns the running daily total. */
  record(costUsd: number): number;
  /** Current UTC-day spend. */
  spentToday(): number;
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
