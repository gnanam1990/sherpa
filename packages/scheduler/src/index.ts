/**
 * @sherpa/scheduler — DCA, alerts, monitors (M3 ownership).
 * Week-1 scope: shape of a scheduled job.
 */

export type JobKind = 'dca' | 'price_alert' | 'wallet_monitor';

export type ScheduledJob = {
  id: string;
  kind: JobKind;
  /** Cron expression or ISO interval. */
  schedule: string;
  enabled: boolean;
};

export * from './hourly-tasks.js';
export * from './dca-runner.js';
export * from './dca-validation.js';
export * from './dca-execution.js';
export * from './alert-runner.js';
export * from './timelock-runner.js';
export * from './auto-repay-runner.js';
