import type { DCAScheduleRow, DCAStore, CreateDCAExecutionInput } from '@sherpa/memory';

export const BUILDER_CODE = 'sherpa-dca-v1';
export const MAX_CONSECUTIVE_FAILURES = 3;

export type ExecutionResult =
  | { ok: true; txHash: string; amountOut: string }
  | { ok: false; error: string };

export interface ExecuteDCAOptions {
  store: DCAStore;
  executeSwap?: (params: SwapParams) => Promise<ExecutionResult>;
  notify?: (userAddress: string, message: string) => Promise<void>;
}

export interface SwapParams {
  fromAsset: Record<string, unknown>;
  toAsset: Record<string, unknown>;
  amountIn: string;
  userAddress: string;
  builderCode: string;
}

export async function executeDCA(
  schedule: DCAScheduleRow,
  options: ExecuteDCAOptions,
): Promise<ExecutionResult> {
  const { store, executeSwap = buildSwapTransaction, notify } = options;

  try {
    const result = await executeSwap({
      fromAsset: schedule.from_asset,
      toAsset: schedule.to_asset,
      amountIn: schedule.amount_per_tick,
      userAddress: schedule.user_address,
      builderCode: BUILDER_CODE,
    });

    if (result.ok) {
      await recordExecution(store, {
        dcaScheduleId: schedule.id,
        amountIn: schedule.amount_per_tick,
        amountOut: result.amountOut,
        txHash: result.txHash,
        status: 'success',
        builderCode: BUILDER_CODE,
      });

      await store.updateSchedule(schedule.id, {
        totalExecutions: schedule.total_executions + 1,
        lastExecutedAt: new Date().toISOString(),
        consecutiveFailures: 0,
      });

      await store.resetFailures(schedule.id);

      if (notify) {
        await notify(
          schedule.user_address,
          `DCA executed: bought ${result.amountOut} of ${(schedule.to_asset as Record<string, string>).symbol ?? 'token'} for ${schedule.amount_per_tick} ${(schedule.from_asset as Record<string, string>).symbol ?? 'token'}`,
        );
      }

      return result;
    } else {
      await handleFailure(store, schedule, result.error, notify);
      return result;
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await handleFailure(store, schedule, errorMsg, notify);
    return { ok: false, error: errorMsg };
  }
}

async function handleFailure(
  store: DCAStore,
  schedule: DCAScheduleRow,
  error: string,
  notify?: (userAddress: string, message: string) => Promise<void>,
): Promise<void> {
  await recordExecution(store, {
    dcaScheduleId: schedule.id,
    amountIn: schedule.amount_per_tick,
    status: 'failed',
    error,
    builderCode: BUILDER_CODE,
  });

  const newFailures = schedule.consecutive_failures + 1;
  await store.incrementFailures(schedule.id);

  if (newFailures >= MAX_CONSECUTIVE_FAILURES) {
    await store.pauseSchedule(schedule.id);
    if (notify) {
      await notify(
        schedule.user_address,
        `Your DCA for ${(schedule.to_asset as Record<string, string>).symbol ?? 'token'} has been paused after ${MAX_CONSECUTIVE_FAILURES} consecutive failures. Last error: ${error}`,
      );
    }
  } else if (notify) {
    await notify(
      schedule.user_address,
      `DCA execution failed (${newFailures}/${MAX_CONSECUTIVE_FAILURES}): ${error}`,
    );
  }
}

export async function buildSwapTransaction(_params: SwapParams): Promise<ExecutionResult> {
  // Stub: in production, this would:
  // 1. Query Aerodrome router for best route
  // 2. Calculate expected output with slippage
  // 3. Build approve + swap calldata
  // 4. Submit via smart wallet with builder code attribution
  // For now, return a mock success
  return {
    ok: true,
    txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    amountOut: '0',
  };
}

export async function recordExecution(
  store: DCAStore,
  input: CreateDCAExecutionInput,
): Promise<void> {
  await store.createExecution(input);
}
