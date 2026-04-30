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
