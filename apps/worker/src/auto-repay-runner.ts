import { InMemoryAutoRepayStore, runAutoRepayCycle, type AutoRepayStore, type AutoRepayDeps } from '@sherpa/memory';
import { fetchAaveHealthFactor } from './evaluators/health-factor.js';
import {
  buildSherpaRouterRepayPlan,
  SHERPA_ROUTER_BASE_MAINNET,
  AERODROME_FACTORY_BASE,
} from '@sherpa/tools';

export { runAutoRepayCycle };

export interface AutoRepayRunnerDeps {
  store?: AutoRepayStore;
  fetchHealthFactor?: (addr: string) => Promise<number>;
  buildRepayTx?: AutoRepayDeps['buildRepayTx'];
  signAndBroadcast?: AutoRepayDeps['signAndBroadcast'];
  notify?: AutoRepayDeps['notify'];
}

export async function autoRepayExecutorNotConfigured(): ReturnType<AutoRepayDeps['buildRepayTx']> {
  throw new Error('auto_repay_executor_not_configured: SherpaRouter calldata builder not wired');
}

export async function autoRepaySignerNotConfigured(): ReturnType<AutoRepayDeps['signAndBroadcast']> {
  throw new Error('auto_repay_signer_not_configured: session-key signing not configured for this wallet');
}

export type RepaySessionKeyDeps = {
  executeWithSessionKey: (tx: { to: string; data: string; value: string }) => Promise<{ ok: boolean; txHash?: string; error?: string }>;
  hasActiveSessionKey: (userAddress: string) => Promise<boolean>;
};

/**
 * Create a buildRepayTx function that builds real calldata via SherpaRouter.
 * Returns the repay step (the approval step must be handled separately by the signer).
 */
export function createRepayTxBuilder(
  rpcUrl?: string,
): AutoRepayDeps['buildRepayTx'] {
  const aavePool = '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5';

  return async (params) => {
    const plan = await buildSherpaRouterRepayPlan({
      asset: params.repayAsset,
      amount: params.amount.toString(),
      deps: {
        routerAddress: SHERPA_ROUTER_BASE_MAINNET,
        aerodromeRouterAddress: '0xcF77a3Ba9A5CA399B7c97c74d58e5979D59C2c2B',
        aerodromeFactoryAddress: AERODROME_FACTORY_BASE,
        aavePoolAddress: aavePool,
        rpcUrl,
      },
    });
    const repayStep = plan.steps.find((s) => s.kind === 'custom');
    if (!repayStep) throw new Error('No repay step in SherpaRouter plan');
    return {
      to: repayStep.to,
      data: repayStep.data,
      value: repayStep.value.toString(),
    };
  };
}

/**
 * Create a signAndBroadcast function that attempts session-key signing,
 * or throws an honest manual-required error.
 */
export function createRepaySigner(
  sessionKeyDeps?: RepaySessionKeyDeps,
): AutoRepayDeps['signAndBroadcast'] {
  return async (tx) => {
    if (sessionKeyDeps) {
      const hasKey = await sessionKeyDeps.hasActiveSessionKey('');
      if (hasKey) {
        const result = await sessionKeyDeps.executeWithSessionKey(tx);
        if (result.ok) return result.txHash!;
        throw new Error(result.error ?? 'session key execution failed');
      }
    }
    throw new Error(
      'Session key signing is not configured for this wallet. Auto-repay requires session-key signing for unattended execution.',
    );
  };
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
