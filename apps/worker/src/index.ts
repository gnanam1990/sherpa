import { InMemoryAlertStore } from '@sherpa/memory';
import { startHealthServer } from './health.js';
import { runAlertCycle } from './alert-runner.js';

const INTERVAL_MS = Number(process.env.ALERT_INTERVAL_MS ?? 60_000);

async function main(): Promise<void> {
  const store = new InMemoryAlertStore();

  await startHealthServer(store);

  console.log(`[worker] alert runner starting (interval=${INTERVAL_MS}ms)`);

  const tick = async () => {
    try {
      const result = await runAlertCycle(store);
      if (result.evaluated > 0) {
        console.log(
          `[worker] cycle done: ${result.evaluated} evaluated, ${result.triggered} triggered, ${result.failed} failed`,
        );
      }
    } catch (err) {
      console.error('[worker] cycle error', err);
    }
  };

  await tick();
  setInterval(tick, INTERVAL_MS);
}

main().catch((err) => {
  console.error('[worker] fatal', err);
  process.exit(1);
});
