import { InMemoryAutoRepayStore, runAutoRepayCycle, type AutoRepayStore, type AutoRepayDeps } from '@sherpa/memory';
import { fetchAaveHealthFactor } from './evaluators/health-factor.js';

export { runAutoRepayCycle };

export interface AutoRepayRunnerDeps {
  store?: AutoRepayStore;
  fetchHealthFactor?: (addr: string) => Promise<number>;
  buildRepayTx?: AutoRepayDeps['buildRepayTx'];
  signAndBroadcast?: AutoRepayDeps['signAndBroadcast'];
  notify?: AutoRepayDeps['notify'];
}

export async function autoRepayExecutorNotConfigured(): ReturnType<AutoRepayDeps['buildRepayTx']> {
  throw new Error('auto_repay_executor_not_configured: Stage 7 session-key executor required');
}

export async function autoRepaySignerNotConfigured(): ReturnType<AutoRepayDeps['signAndBroadcast']> {
  throw new Error('auto_repay_signer_not_configured: no production broadcaster configured');
}

export function createAutoRepayRunner(overrides: AutoRepayRunnerDeps = {}) {
  const store = overrides.store ?? new InMemoryAutoRepayStore();
  const fetchHF = overrides.fetchHealthFactor ?? fetchAaveHealthFactor;
  const buildTx = overrides.buildRepayTx ?? autoRepayExecutorNotConfigured;
  const sign = overrides.signAndBroadcast ?? autoRepaySignerNotConfigured;
  const notify = overrides.notify ?? (async () => {});

  const deps: AutoRepayDeps = {
    store,
    fetchHealthFactor: fetchHF,
    buildRepayTx: buildTx,
    signAndBroadcast: sign,
    notify,
  };

  return {
    store,
    deps,
    async runOnce() {
      return runAutoRepayCycle(deps);
    },
  };
}

export async function runAutoRepayWorkerCycle(
  store: AutoRepayStore,
  overrides: Partial<AutoRepayDeps> = {},
): Promise<{ evaluated: number; triggered: number; repaid: number; failed: number; errors: string[] }> {
  const deps: AutoRepayDeps = {
    store,
    fetchHealthFactor: overrides.fetchHealthFactor ?? fetchAaveHealthFactor,
    buildRepayTx: overrides.buildRepayTx ?? autoRepayExecutorNotConfigured,
    signAndBroadcast: overrides.signAndBroadcast ?? autoRepaySignerNotConfigured,
    notify: overrides.notify ?? (async () => {}),
  };
  return runAutoRepayCycle(deps);
}
