import type { TaskContext } from './hourly-tasks.js';

export type TimeLockRow = {
  id: string;
  user_address: string;
  action_type: string;
  action_params: Record<string, unknown>;
  scheduled_at: string;
  status: string;
  executed_at?: string;
  tx_hash?: string;
};

export async function runTimeLockTasks(ctx: TaskContext): Promise<{ ok: boolean; detail?: string }> {
  try {
    // const locks = await ctx.db.query('SELECT * FROM time_locks WHERE status = $1 AND scheduled_at <= now()', ['pending']);

    // Stub: no DB yet
    const locks: TimeLockRow[] = [];

    let executed = 0;
    let failed = 0;

    for (const lock of locks) {
      try {
        // Execute the scheduled action
        executed++;
      } catch (err) {
        failed++;
        ctx.log.error('Time-lock execution failed', { err, lockId: lock.id });
      }
    }

    return { ok: true, detail: `TimeLock: ${executed} executed, ${failed} failed` };
  } catch (err) {
    return { ok: false, detail: String(err) };
  }
}

export function parseScheduledTime(timeStr: string): Date | null {
  const now = new Date();

  const relativeMatch = timeStr.match(/in\s+(\d+)\s+(minute|hour|day|week|month)s?/i);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1]!);
    const unit = relativeMatch[2]!.toLowerCase();
    const result = new Date(now);
    switch (unit) {
      case 'minute':
        result.setMinutes(result.getMinutes() + amount);
        break;
      case 'hour':
        result.setHours(result.getHours() + amount);
        break;
      case 'day':
        result.setDate(result.getDate() + amount);
        break;
      case 'week':
        result.setDate(result.getDate() + amount * 7);
        break;
      case 'month':
        result.setMonth(result.getMonth() + amount);
        break;
    }
    return result;
  }

  return null;
}
