import type { TaskContext } from './hourly-tasks.js';
import type { DCAStore, DCAScheduleRow } from '@sherpa/memory';
import { validateBalance, type ValidateBalanceParams, type ValidationResult } from './dca-validation.js';
import { executeDCA, MAX_CONSECUTIVE_FAILURES, type ExecutionResult, type SwapParams } from './dca-execution.js';

export type { DCAScheduleRow };
export type BalanceChecker = (params: ValidateBalanceParams) => Promise<ValidationResult>;

export async function sessionKeyNotConfigured(_params: SwapParams): Promise<ExecutionResult> {
  return {
    ok: false,
    error: 'session_key_executor_not_configured: Stage 7 required for on-chain DCA execution',
  };
}

export async function runDCATasks(
  ctx: TaskContext,
  store?: DCAStore,
  executeSwap: (params: SwapParams) => Promise<ExecutionResult> = sessionKeyNotConfigured,
  checkBalance: BalanceChecker = validateBalance,
): Promise<{ ok: boolean; detail?: string }> {
  try {
    const now = new Date().toISOString();
    const schedules = store ? await store.getDueSchedules(now) : [];

    let executed = 0;
    let failed = 0;
    let skipped = 0;

    for (const schedule of schedules) {
      try {
        if (schedule.consecutive_failures >= MAX_CONSECUTIVE_FAILURES) {
          if (store) await store.pauseSchedule(schedule.id);
          skipped++;
          continue;
        }

        const shouldEnd = checkEndCondition(schedule);
        if (shouldEnd) {
          if (store) await store.updateSchedule(schedule.id, { status: 'completed' });
          skipped++;
          continue;
        }

        if (store) {
          const fromAsset = schedule.from_asset as { address?: string; decimals?: number };
          const tokenAddress = fromAsset.address;
          if (!tokenAddress) {
            skipped++;
            continue;
          }
          const decimals = fromAsset.decimals ?? 18;
          const amountBigint = BigInt(Math.round(Number(schedule.amount_per_tick) * 10 ** decimals));
          const balanceCheck = await checkBalance({ userAddress: schedule.user_address, token: tokenAddress, amount: amountBigint });
          if (!balanceCheck.ok) {
            skipped++;
            continue;
          }
        }

        const result = await executeDCA(schedule, {
          store: store!,
          executeSwap,
          notify: async (addr, msg) => {
            ctx.log.error(`[DCA notification] ${addr}: ${msg}`);
          },
        });

        if (result.ok) {
          executed++;
          if (store) {
            const nextExec = calculateNextExecution(
              schedule.frequency,
              schedule.day_of_week ?? undefined,
              schedule.day_of_month ?? undefined,
              schedule.hour_of_day,
            );
            await store.updateSchedule(schedule.id, {
              nextExecutionAt: nextExec.toISOString(),
            });
          }
        } else {
          failed++;
        }
      } catch (err) {
        ctx.log.error('DCA execution failed', { err, scheduleId: schedule.id });
        failed++;
      }
    }

    return { ok: true, detail: `DCA: ${executed} executed, ${failed} failed, ${skipped} skipped` };
  } catch (err) {
    ctx.log.error('DCA runner error', { err });
    return { ok: false, detail: String(err) };
  }
}

export function checkEndCondition(schedule: DCAScheduleRow): boolean {
  if (schedule.end_condition === 'count' && schedule.max_executions != null) {
    return schedule.total_executions >= schedule.max_executions;
  }
  if (schedule.end_condition === 'date' && schedule.end_date) {
    return new Date(schedule.end_date).getTime() <= Date.now();
  }
  if (schedule.total_budget && schedule.remaining_budget) {
    return Number(schedule.remaining_budget) <= 0;
  }
  return false;
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
      while (next.getUTCDay() !== (dayOfWeek ?? 1) || next <= now) {
        next.setUTCDate(next.getUTCDate() + 1);
      }
      break;
    case 'biweekly':
      while (next.getUTCDay() !== (dayOfWeek ?? 1) || next <= now) {
        next.setUTCDate(next.getUTCDate() + 1);
      }
      next.setUTCDate(next.getUTCDate() + 7);
      break;
    case 'monthly':
      next.setUTCDate(dayOfMonth ?? 1);
      if (next <= now) next.setUTCMonth(next.getUTCMonth() + 1);
      break;
  }

  return next;
}
