import { getPool, type SherpaConfig } from '@sherpa/config';
import {
  createAlertStore,
  createAutoRepayStore,
  createDCAStore,
  createNotificationStore,
  getActiveNotificationToken,
  InMemoryPortfolioSnapshotStore,
  type AlertStore,
  type AutoRepayStore,
  type DCAStore,
  type NotificationStore,
  type PortfolioSnapshotStore,
} from '@sherpa/memory';
import {
  runDCATasks,
  createSwapExecutor,
  validateBalance,
  type SwapParams,
  type SwapBuildResult,
} from '@sherpa/scheduler';
import { runAlertCycle } from './alert-runner.js';
import { runAutoRepayWorkerCycle } from './auto-repay-runner.js';
import { fetchAaveHealthFactor } from './evaluators/health-factor.js';
import { setFarcasterTokenResolver, setNotificationStore } from './notifiers/index.js';
import {
  buildSherpaRouterSwapPlan,
  SHERPA_ROUTER_BASE_MAINNET,
  AERODROME_FACTORY_BASE,
} from '@sherpa/tools';

export type WorkerLogger = {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
};

export type WorkerStores = {
  alertStore: AlertStore;
  dcaStore: DCAStore;
  autoRepayStore: AutoRepayStore;
  notificationStore: NotificationStore;
  snapshotStore: PortfolioSnapshotStore;
  persistence: 'postgres' | 'process-memory';
};

export type WorkerIntervals = {
  alertsMs: number;
  dcaMs: number;
  autoRepayMs: number;
  snapshotMs: number;
};

export type WorkerToggles = {
  alerts: boolean;
  dca: boolean;
  autoRepay: boolean;
  snapshot: boolean;
};

export type WorkerReadiness = {
  notifications: {
    email: 'configured' | 'missing_provider';
    webPush: 'configured' | 'missing_vapid_keys';
    telegram: 'configured' | 'missing_bot_token';
    farcaster: 'token_store_configured' | 'requires_postgres_token_store';
  };
  execution: {
    dca: {
      mode: 'fail-closed';
      reason: string;
    };
    autoRepay: {
      mode: 'fail-closed';
      reason: string;
    };
  };
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
const DEFAULT_SNAPSHOT_INTERVAL_MS = 3_600_000; // 1 hour default

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
    snapshotMs: intFromEnv(env.SNAPSHOT_INTERVAL_MS, DEFAULT_SNAPSHOT_INTERVAL_MS),
  };
}

export function readWorkerToggles(env: NodeJS.ProcessEnv = process.env): WorkerToggles {
  return {
    alerts: boolFromEnv(env.WORKER_ALERTS_ENABLED, true),
    dca: boolFromEnv(env.WORKER_DCA_ENABLED, true),
    autoRepay: boolFromEnv(env.WORKER_AUTO_REPAY_ENABLED, true),
    snapshot: boolFromEnv(env.WORKER_SNAPSHOT_ENABLED, true),
  };
}

export function readWorkerReadiness(
  env: NodeJS.ProcessEnv = process.env,
  stores?: Pick<WorkerStores, 'persistence'>,
): WorkerReadiness {
  return {
    notifications: {
      email: env.RESEND_API_KEY || env.POSTMARK_API_KEY ? 'configured' : 'missing_provider',
      webPush:
        env.WEB_PUSH_VAPID_PUBLIC_KEY && env.WEB_PUSH_VAPID_PRIVATE_KEY
          ? 'configured'
          : 'missing_vapid_keys',
      telegram: env.TELEGRAM_BOT_TOKEN ? 'configured' : 'missing_bot_token',
      farcaster:
        stores?.persistence === 'postgres'
          ? 'token_store_configured'
          : 'requires_postgres_token_store',
    },
    execution: {
      dca: {
        mode: 'fail-closed',
        reason: 'session_key_signing_not_configured: DCA builds real swap calldata via SherpaRouter but requires session-key signing for unattended execution',
      },
      autoRepay: {
        mode: 'fail-closed',
        reason: 'auto_repay_signer_not_configured: unattended repayment requires audited broadcaster setup',
      },
    },
  };
}

export function createWorkerStores(config: SherpaConfig): WorkerStores {
  const storeConfig = config.databaseUrl ? config : { ...config, useRealDb: false };
  return {
    alertStore: createAlertStore(storeConfig),
    dcaStore: createDCAStore(storeConfig),
    autoRepayStore: createAutoRepayStore(storeConfig),
    notificationStore: createNotificationStore(storeConfig),
    snapshotStore: new InMemoryPortfolioSnapshotStore(), // TODO: use Postgres when useRealDb
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
  const aavePool = '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5';
  const aerodromeRouter = '0xcF77a3Ba9A5CA399B7c97c74d58e5979D59C2c2B';

  const buildSwap = async (params: SwapParams): Promise<SwapBuildResult> => {
    const fromAsset = params.fromAsset as { symbol?: string };
    const toAsset = params.toAsset as { symbol?: string };
    const plan = await buildSherpaRouterSwapPlan({
      fromAsset: fromAsset.symbol ?? 'USDC',
      toAsset: toAsset.symbol ?? 'ETH',
      amount: params.amountIn,
      deps: {
        routerAddress: SHERPA_ROUTER_BASE_MAINNET,
        aerodromeRouterAddress: aerodromeRouter,
        aerodromeFactoryAddress: AERODROME_FACTORY_BASE,
        aavePoolAddress: aavePool,
        rpcUrl: config.rpcUrl,
      },
    });
    const swapStep = plan.steps.find((s) => s.kind === 'swap');
    if (!swapStep) throw new Error('No swap step in SherpaRouter plan');
    return {
      to: swapStep.to,
      data: swapStep.data,
      value: swapStep.value,
      minOut: plan.minOut ?? 0n,
      deadline: BigInt(Math.floor(Date.now() / 1000) + 600),
      amountInBaseUnits: plan.amountBaseUnits,
    };
  };

  const executor = createSwapExecutor(buildSwap);

  return runDCATasks(
    {
      log: {
        error(message, meta) {
          log.error(message, meta);
        },
      },
    },
    stores.dcaStore,
    executor,
    (params) => validateBalance({ ...params, rpcUrl: config.rpcUrl }),
  );
}

export async function runAutoRepayProductionCycle(
  config: SherpaConfig,
  stores: Pick<WorkerStores, 'autoRepayStore' | 'notificationStore'>,
): Promise<WorkerCycleResult> {
  const { createRepayTxBuilder } = await import('./auto-repay-runner.js');
  return runAutoRepayWorkerCycle(stores.autoRepayStore, {
    fetchHealthFactor: (addr) => fetchAaveHealthFactor(addr, config.baseMainnetRpcUrl),
    buildRepayTx: createRepayTxBuilder(config.rpcUrl),
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

export async function runSnapshotProductionCycle(
  config: SherpaConfig,
  stores: Pick<WorkerStores, 'snapshotStore'>,
  log: WorkerLogger,
): Promise<WorkerCycleResult> {
  const { runSnapshotCycle } = await import('./portfolio-snapshot.js');
  const result = await runSnapshotCycle({
    store: stores.snapshotStore,
    fetchDeps: { rpcUrl: config.rpcUrl },
    log,
  });
  return {
    ok: result.errors.length === 0,
    detail: `snapshots: ${result.snapshotCount} captured, ${result.errors.length} errors`,
  };
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
    readiness: readWorkerReadiness(process.env, stores),
    persistence: stores.persistence,
  };
}

export function attachNotificationStore(
  stores: Pick<WorkerStores, 'notificationStore'>,
  config?: Pick<SherpaConfig, 'useRealDb' | 'databaseUrl'>,
): void {
  setNotificationStore(stores.notificationStore);
  if (!config?.useRealDb || !config.databaseUrl) {
    setFarcasterTokenResolver(undefined);
    return;
  }

  const pool = getPool(config);
  setFarcasterTokenResolver(async (fid) => {
    const token = await getActiveNotificationToken(pool, BigInt(fid));
    return token ? { token: token.token, url: token.url } : null;
  });
}
