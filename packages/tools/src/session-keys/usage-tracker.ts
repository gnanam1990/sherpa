export interface UsageLimits {
  perTxValue?: string;
  dailyTotal?: string;
  totalLimit?: string;
  maxExecutionsPerDay?: number;
}

export interface UsageSnapshot {
  spentTotal: string;
  executionCount: number;
  todaySpent: string;
  todayExecutions: number;
}

export interface UsageCheckResult {
  ok: boolean;
  errors: string[];
}

export function checkUsageLimits(
  limits: UsageLimits,
  snapshot: UsageSnapshot,
  txValue: string,
): UsageCheckResult {
  const errors: string[] = [];
  const value = BigInt(txValue);
  const spentTotal = BigInt(snapshot.spentTotal);
  const todaySpent = BigInt(snapshot.todaySpent);

  if (limits.perTxValue) {
    const max = BigInt(limits.perTxValue);
    if (value > max) {
      errors.push(`Per-transaction limit exceeded: ${txValue} > ${limits.perTxValue}`);
    }
  }

  if (limits.dailyTotal) {
    const max = BigInt(limits.dailyTotal);
    if (todaySpent + value > max) {
      errors.push(
        `Daily limit exceeded: ${snapshot.todaySpent} + ${txValue} > ${limits.dailyTotal}`,
      );
    }
  }

  if (limits.totalLimit) {
    const max = BigInt(limits.totalLimit);
    if (spentTotal + value > max) {
      errors.push(
        `Total limit exceeded: ${snapshot.spentTotal} + ${txValue} > ${limits.totalLimit}`,
      );
    }
  }

  if (limits.maxExecutionsPerDay !== undefined) {
    if (snapshot.todayExecutions >= limits.maxExecutionsPerDay) {
      errors.push(
        `Daily execution limit reached: ${snapshot.todayExecutions} >= ${limits.maxExecutionsPerDay}`,
      );
    }
  }

  return { ok: errors.length === 0, errors };
}

export function buildUsageSnapshot(
  spentTotal: string,
  executionCount: number,
  todaySpent: string,
  todayExecutions: number,
): UsageSnapshot {
  return { spentTotal, executionCount, todaySpent, todayExecutions };
}
