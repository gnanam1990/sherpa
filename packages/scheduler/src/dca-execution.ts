import type { DCAScheduleRow, DCAStore, CreateDCAExecutionInput } from '@sherpa/memory';

export const BUILDER_CODE = 'sherpa-dca-v1';
export const MAX_CONSECUTIVE_FAILURES = 3;

export type ExecutionResult =
  | { ok: true; txHash: string; amountOut: string }
  | { ok: false; error: string; manualRequired?: boolean };

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

export interface SwapBuildResult {
  to: string;
  data: `0x${string}`;
  value: bigint;
  minOut: bigint;
  deadline: bigint;
  amountInBaseUnits: bigint;
}

export type BuildSwapFn = (params: SwapParams) => Promise<SwapBuildResult>;

export interface SessionKeyExecutionDeps {
  executeWithSessionKey: (tx: { to: string; data: string; value: string }) => Promise<{ ok: boolean; txHash?: string; error?: string }>;
  hasActiveSessionKey: (userAddress: string) => Promise<boolean>;
}

export async function executeDCA(
  schedule: DCAScheduleRow,
  options: ExecuteDCAOptions,
): Promise<ExecutionResult> {
  const { store, executeSwap, notify } = options;

  if (!executeSwap) {
    throw new Error('executeSwap function required — refusing to fake success');
  }

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

/**
 * Build real swap calldata using the injected buildSwap function.
 * The caller provides the actual swap builder (e.g. SherpaRouter.buildSherpaRouterSwapPlan).
 */
export async function buildSwapTransaction(
  params: SwapParams,
  buildSwap: BuildSwapFn,
): Promise<SwapBuildResult> {
  return buildSwap(params);
}

/**
 * Create an executeSwap function that attempts session-key signing when available,
 * or returns an honest manual-required error when session keys are not configured.
 *
 * This is the production wiring point: the worker calls this to get a real executor.
 */
export function createSwapExecutor(
  buildSwap: BuildSwapFn,
  sessionKeyDeps?: SessionKeyExecutionDeps,
): (params: SwapParams) => Promise<ExecutionResult> {
  return async (params: SwapParams): Promise<ExecutionResult> => {
    try {
      const tx = await buildSwapTransaction(params, buildSwap);

      if (sessionKeyDeps) {
        const hasKey = await sessionKeyDeps.hasActiveSessionKey(params.userAddress);
        if (hasKey) {
          const result = await sessionKeyDeps.executeWithSessionKey({
            to: tx.to,
            data: tx.data,
            value: tx.value.toString(),
          });
          if (result.ok) {
            return { ok: true, txHash: result.txHash!, amountOut: tx.minOut.toString() };
          }
          return { ok: false, error: result.error ?? 'session key execution failed' };
        }
      }

      return {
        ok: false,
        error: 'Session key signing is not configured for this wallet. Each DCA cycle requires your signature until session keys are enabled.',
        manualRequired: true,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: msg };
    }
  };
}

export async function recordExecution(
  store: DCAStore,
  input: CreateDCAExecutionInput,
): Promise<void> {
  await store.createExecution(input);
}
