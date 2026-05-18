import { describe, expect, test, vi } from 'vitest';
import { loadConfig } from '@sherpa/config';
import {
  createWorkerStores,
  logCycleResult,
  readWorkerIntervals,
  readWorkerToggles,
  readWorkerReadiness,
  runDCAWorkerCycle,
} from './runtime.js';
import { InMemoryDCAStore } from '@sherpa/memory';

function testConfig() {
  return loadConfig({
    SHERPA_CHAIN: 'base-sepolia',
    SHERPA_USE_REAL_DB: 'false',
    SHERPA_USE_REAL_RPC: 'false',
  } as NodeJS.ProcessEnv);
}

describe('worker runtime', () => {
  test('reads loop intervals with safe fallbacks', () => {
    expect(readWorkerIntervals({} as NodeJS.ProcessEnv)).toEqual({
      alertsMs: 60_000,
      dcaMs: 60_000,
      autoRepayMs: 60_000,
      snapshotMs: 3_600_000,
    });
    expect(
      readWorkerIntervals({
        ALERT_INTERVAL_MS: '15000',
        DCA_INTERVAL_MS: '0',
        AUTO_REPAY_INTERVAL_MS: 'bad',
      } as NodeJS.ProcessEnv),
    ).toEqual({
      alertsMs: 15_000,
      dcaMs: 60_000,
      autoRepayMs: 60_000,
      snapshotMs: 3_600_000,
    });
  });

  test('reads loop toggles with explicit opt-out', () => {
    expect(readWorkerToggles({} as NodeJS.ProcessEnv)).toEqual({
      alerts: true,
      dca: true,
      autoRepay: true,
      snapshot: true,
    });
    expect(
      readWorkerToggles({
        WORKER_ALERTS_ENABLED: 'false',
        WORKER_DCA_ENABLED: '0',
        WORKER_AUTO_REPAY_ENABLED: 'off',
      } as NodeJS.ProcessEnv),
    ).toEqual({
      alerts: false,
      dca: false,
      autoRepay: false,
      snapshot: true,
    });
  });

  test('reports notification and execution readiness without pretending automation can sign', () => {
    const readiness = readWorkerReadiness({
      RESEND_API_KEY: 'resend-test',
      WEB_PUSH_VAPID_PUBLIC_KEY: 'public',
      WEB_PUSH_VAPID_PRIVATE_KEY: 'private',
      TELEGRAM_BOT_TOKEN: 'telegram-test',
    } as NodeJS.ProcessEnv, { persistence: 'postgres' });

    expect(readiness.notifications).toEqual({
      email: 'configured',
      webPush: 'configured',
      telegram: 'configured',
      farcaster: 'token_store_configured',
    });
    expect(readiness.execution.dca.mode).toBe('fail-closed');
    expect(readiness.execution.dca.reason).toContain('session_key_signing_not_configured');
    expect(readiness.execution.autoRepay.mode).toBe('fail-closed');
    expect(readiness.execution.autoRepay.reason).toContain('auto_repay_signer_not_configured');
  });

  test('reports missing production notification provider configuration', () => {
    const readiness = readWorkerReadiness({} as NodeJS.ProcessEnv, { persistence: 'process-memory' });
    expect(readiness.notifications).toEqual({
      email: 'missing_provider',
      webPush: 'missing_vapid_keys',
      telegram: 'missing_bot_token',
      farcaster: 'requires_postgres_token_store',
    });
  });

  test('creates process-memory stores when real DB is disabled', () => {
    const stores = createWorkerStores(testConfig());
    expect(stores.persistence).toBe('process-memory');
    expect(stores.alertStore).toBeDefined();
    expect(stores.dcaStore).toBeDefined();
    expect(stores.autoRepayStore).toBeDefined();
    expect(stores.notificationStore).toBeDefined();
  });

  test('DCA cycle reads schedules from the injected store', async () => {
    const store = new InMemoryDCAStore();
    await store.createSchedule({
      userAddress: '0x1111111111111111111111111111111111111111',
      fromAsset: { symbol: 'USDC' },
      toAsset: { symbol: 'ETH', address: '0x3333333333333333333333333333333333333333' },
      amountPerTick: '1',
      frequency: 'daily',
      nextExecutionAt: new Date(Date.now() - 1000).toISOString(),
    });
    const log = { info: vi.fn(), error: vi.fn() };

    const result = await runDCAWorkerCycle(testConfig(), { dcaStore: store }, log);

    expect(result.ok).toBe(true);
    expect(result.detail).toContain('0 executed, 0 failed, 1 skipped');
  });

  test('logs failed cycle results as errors', () => {
    const log = { info: vi.fn(), error: vi.fn() };
    logCycleResult('auto-repay', { failed: 1, errors: ['boom'] }, log);
    expect(log.error).toHaveBeenCalledWith(
      '[worker] auto-repay cycle completed with issues',
      expect.objectContaining({ failed: 1, errors: ['boom'] }),
    );
    expect(log.info).not.toHaveBeenCalled();
  });
});
