import type { TaskContext } from './hourly-tasks.js';

export type DCAScheduleRow = {
  id: string;
  user_address: string;
  from_asset: any;
  to_asset: any;
  amount_per_tick: string;
  frequency: string;
  status: string;
  next_execution_at: string;
  total_executions: number;
  max_executions?: number;
};

export async function runDCATasks(ctx: TaskContext): Promise<{ ok: boolean; detail?: string }> {
  try {
    // 1. Fetch all active DCA schedules due for execution
    // const schedules = await ctx.db.query('SELECT * FROM dca_schedules WHERE status = $1 AND next_execution_at <= now()', ['active']);

    // Stub: no DB yet
    const schedules: DCAScheduleRow[] = [];

    let executed = 0;
    let failed = 0;

    for (const schedule of schedules) {
      try {
        // 2. Build SWAP intent for this DCA tick
        // 3. Execute via Sherpa API
        // 4. Update next_execution_at
        // 5. Log execution
        executed++;
      } catch (err) {
        ctx.log.error('DCA execution failed', { err, scheduleId: schedule.id });
        failed++;
      }
    }

    return { ok: true, detail: `DCA: ${executed} executed, ${failed} failed` };
  } catch (err) {
    ctx.log.error('DCA runner error', { err });
    return { ok: false, detail: String(err) };
  }
}

export function calculateNextExecution(
  frequency: string,
  dayOfWeek?: number,
  dayOfMonth?: number,
  hourOfDay: number = 12,
): Date {
  const now = new Date();
  const next = new Date();
  next.setUTCHours(hourOfDay, 0, 0, 0);

  switch (frequency) {
    case 'daily':
      if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
      break;
    case 'weekly':
      // Find next occurrence of dayOfWeek
      while (next.getUTCDay() !== (dayOfWeek ?? 1) || next <= now) {
        next.setUTCDate(next.getUTCDate() + 1);
      }
      break;
    case 'monthly':
      next.setUTCDate(dayOfMonth ?? 1);
      if (next <= now) next.setUTCMonth(next.getUTCMonth() + 1);
      break;
  }

  return next;
}
