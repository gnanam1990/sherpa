export type TaskContext = {
  /** Bound logger (surface='cron') for tasks to write into. */
  log: { error(msg: string, meta?: Record<string, unknown>): void };
};

export type HourlyTask = {
  name: string;
  run(ctx: TaskContext): Promise<{ ok: boolean; detail?: string }>;
};

/**
 * Empty in Stage 1. Stage 4 registers DCA, price-alert, and wallet-monitor
 * executors here so apps/api stays a thin cron transport.
 */
export const HOURLY_TASKS: HourlyTask[] = [];
