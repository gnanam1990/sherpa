import type { SherpaConfig } from '@sherpa/config';
import {
  createAlertStore,
  createAutoRepayStore,
  createDCAStore,
  createNotificationStore,
  type AlertStore,
  type AutoRepayStore,
  type DCAStore,
  type NotificationStore,
} from '@sherpa/memory';
import {
  runDCATasks,
  sessionKeyNotConfigured,
  validateBalance,
} from '@sherpa/scheduler';
import { runAlertCycle } from './alert-runner.js';
import { runAutoRepayWorkerCycle } from './auto-repay-runner.js';
import { fetchAaveHealthFactor } from './evaluators/health-factor.js';
import { setNotificationStore } from './notifiers/index.js';

export type WorkerLogger = {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
};

export type WorkerStores = {
  alertStore: AlertStore;
  dcaStore: DCAStore;
  autoRepayStore: AutoRepayStore;
  notificationStore: NotificationStore;
  persistence: 'postgres' | 'process-memory';
};

export type WorkerIntervals = {
  alertsMs: number;
  dcaMs: number;
  autoRepayMs: number;
};

export type WorkerToggles = {
  alerts: boolean;
  dca: boolean;
  autoRepay: boolean;
};

export type WorkerCycleResult = {
  ok?: boolean;
  detail?: string;
  evaluated?: number;
  triggered?: number;
  repaid?: number;
  failed?: number;
  errors?: string[];
};

const DEFAULT_ALERT_INTERVAL_MS = 60_000;
const DEFAULT_DCA_INTERVAL_MS = 60_000;
const DEFAULT_AUTO_REPAY_INTERVAL_MS = 60_000;

function intFromEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function boolFromEnv(value: string | undefined, fallback = true): boolean {
  if (value === undefined || value === '') return fallback;
  return !['0', 'false', 'no', 'off'].includes(value.toLowerCase());
}

export function readWorkerIntervals(env: NodeJS.ProcessEnv = process.env): WorkerIntervals {
  return {
    alertsMs: intFromEnv(env.ALERT_INTERVAL_MS, DEFAULT_ALERT_INTERVAL_MS),
    dcaMs: intFromEnv(env.DCA_INTERVAL_MS, DEFAULT_DCA_INTERVAL_MS),
    autoRepayMs: intFromEnv(env.AUTO_REPAY_INTERVAL_MS, DEFAULT_AUTO_REPAY_INTERVAL_MS),
  };
}

export function readWorkerToggles(env: NodeJS.ProcessEnv = process.env): WorkerToggles {
  return {
    alerts: boolFromEnv(env.WORKER_ALERTS_ENABLED, true),
    dca: boolFromEnv(env.WORKER_DCA_ENABLED, true),
    autoRepay: boolFromEnv(env.WORKER_AUTO_REPAY_ENABLED, true),
  };
}

export function createWorkerStores(config: SherpaConfig): WorkerStores {
  const storeConfig = config.databaseUrl ? config : { ...config, useRealDb: false };
  return {
    alertStore: createAlertStore(storeConfig),
    dcaStore: createDCAStore(storeConfig),
    autoRepayStore: createAutoRepayStore(storeConfig),
    notificationStore: createNotificationStore(storeConfig),
    persistence: storeConfig.useRealDb ? 'postgres' : 'process-memory',
  };
}

export function createConsoleLogger(): WorkerLogger {
  return {
    info(message, meta) {
      if (meta) console.log(message, meta);
      else console.log(message);
    },
    error(message, meta) {
      if (meta) console.error(message, meta);
      else console.error(message);
    },
  };
}

export async function runAlertWorkerCycle(
  stores: Pick<WorkerStores, 'alertStore'>,
): Promise<WorkerCycleResult> {
  return runAlertCycle(stores.alertStore);
}

export async function runDCAWorkerCycle(
  config: SherpaConfig,
  stores: Pick<WorkerStores, 'dcaStore'>,
  log: WorkerLogger,
): Promise<WorkerCycleResult> {
  return runDCATasks(
    {
      log: {
        error(message, meta) {
          log.error(message, meta);
        },
      },
    },
    stores.dcaStore,
    sessionKeyNotConfigured,
    (params) => validateBalance({ ...params, rpcUrl: config.rpcUrl }),
  );
}

export async function runAutoRepayProductionCycle(
  config: SherpaConfig,
  stores: Pick<WorkerStores, 'autoRepayStore' | 'notificationStore'>,
): Promise<WorkerCycleResult> {
  return runAutoRepayWorkerCycle(stores.autoRepayStore, {
    fetchHealthFactor: (addr) => fetchAaveHealthFactor(addr, config.baseMainnetRpcUrl),
    notify: async (userAddress, message) => {
      await stores.notificationStore.logNotification({
        userAddress,
        channel: 'push',
        payload: {
          title: 'Sherpa auto-repay',
          body: message,
          data: { surface: 'auto-repay' },
        },
        status: 'sent',
        sentAt: new Date().toISOString(),
      });
    },
  });
}

export function logCycleResult(
  name: string,
  result: WorkerCycleResult,
  log: WorkerLogger,
): void {
  const meta = {
    ok: result.ok,
    detail: result.detail,
    evaluated: result.evaluated,
    triggered: result.triggered,
    repaid: result.repaid,
    failed: result.failed,
    errors: result.errors?.slice(0, 5),
  };
  if ((result.failed ?? 0) > 0 || result.ok === false || (result.errors?.length ?? 0) > 0) {
    log.error(`[worker] ${name} cycle completed with issues`, meta);
  } else {
    log.info(`[worker] ${name} cycle completed`, meta);
  }
}

export function startRecurringCycle(
  name: string,
  intervalMs: number,
  task: () => Promise<WorkerCycleResult>,
  log: WorkerLogger,
): NodeJS.Timeout {
  let running = false;
  const tick = async () => {
    if (running) {
      log.error(`[worker] ${name} cycle skipped because previous run is still active`);
      return;
    }
    running = true;
    try {
      logCycleResult(name, await task(), log);
    } catch (err) {
      log.error(`[worker] ${name} cycle crashed`, {
        err: err instanceof Error ? err.message : String(err),
      });
    } finally {
      running = false;
    }
  };

  void tick();
  return setInterval(tick, intervalMs);
}

export async function workerHealthExtra(stores: WorkerStores): Promise<Record<string, unknown>> {
  const [dueDca, activeAutoRepay] = await Promise.all([
    stores.dcaStore.getDueSchedules(new Date().toISOString()),
    stores.autoRepayStore.getActiveRules(),
  ]);
  return {
    dueDcaSchedules: dueDca.length,
    activeAutoRepayRules: activeAutoRepay.length,
    persistence: stores.persistence,
  };
}

export function attachNotificationStore(stores: Pick<WorkerStores, 'notificationStore'>): void {
  setNotificationStore(stores.notificationStore);
}
