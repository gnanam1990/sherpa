import { loadConfig } from '@sherpa/config';
import { startHealthServer } from './health.js';
import {
  attachNotificationStore,
  createConsoleLogger,
  createWorkerStores,
  readWorkerIntervals,
  readWorkerToggles,
  runAlertWorkerCycle,
  runAutoRepayProductionCycle,
  runDCAWorkerCycle,
  runSnapshotProductionCycle,
  startRecurringCycle,
  workerHealthExtra,
} from './runtime.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const log = createConsoleLogger();
  const stores = createWorkerStores(config);
  const intervals = readWorkerIntervals();
  const toggles = readWorkerToggles();

  attachNotificationStore(stores, config);
  await startHealthServer(stores.alertStore, Number(process.env.PORT ?? 3001), () =>
    workerHealthExtra(stores),
  );

  log.info('[worker] automation worker starting', {
    persistence: stores.persistence,
    chain: config.chainEnv,
    alerts: toggles.alerts,
    dca: toggles.dca,
    autoRepay: toggles.autoRepay,
    intervals,
  });

  if (toggles.alerts) {
    startRecurringCycle(
      'alerts',
      intervals.alertsMs,
      () => runAlertWorkerCycle(stores),
      log,
    );
  }

  if (toggles.dca) {
    startRecurringCycle(
      'dca',
      intervals.dcaMs,
      () => runDCAWorkerCycle(config, stores, log),
      log,
    );
  }

  if (toggles.autoRepay) {
    startRecurringCycle(
      'auto-repay',
      intervals.autoRepayMs,
      () => runAutoRepayProductionCycle(config, stores),
      log,
    );
  }

  if (toggles.snapshot) {
    startRecurringCycle(
      'snapshot',
      intervals.snapshotMs,
      () => runSnapshotProductionCycle(config, stores, log),
      log,
    );
  }

  if (!toggles.alerts && !toggles.dca && !toggles.autoRepay && !toggles.snapshot) {
    log.error('[worker] no automation loops enabled');
  }
}

main().catch((err) => {
  console.error('[worker] fatal', err);
  process.exit(1);
});
