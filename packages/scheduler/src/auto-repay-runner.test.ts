import { describe, test, expect, vi } from 'vitest';
import {
  calculateRepayAmount,
  shouldTrigger,
  estimatePostRepayHF,
  runAutoRepayCycle,
  loadActiveRules,
  checkHealthFactor,
  InMemoryAutoRepayStore,
  type AutoRepayDeps,
  type AutoRepayRuleRow,
} from '@sherpa/memory';

function makeRule(overrides: Partial<AutoRepayRuleRow> = {}): AutoRepayRuleRow {
  return {
    id: crypto.randomUUID(),
    user_address: '0x1234567890123456789012345678901234567890',
    trigger_hf: 13000,
    target_hf: 15000,
    max_repay_per_execution: '1000000000',
    repay_source: ['usdc'],
    status: 'active',
    consecutive_failures: 0,
    total_repayments: 0,
    total_repaid_usd: '0',
    authorization_tx_hash: null,
    created_at: new Date().toISOString(),
    last_evaluated_at: null,
    last_triggered_at: null,
    max_per_day: 5,
    ...overrides,
  };
}

function makeDeps(overrides: Partial<AutoRepayDeps> = {}): AutoRepayDeps {
  return {
    store: new InMemoryAutoRepayStore(),
    fetchHealthFactor: async () => 1.5,
    buildRepayTx: async () => ({ to: '0xabc', data: '0xdef', value: '0' }),
    signAndBroadcast: async () => '0xtxhash',
    notify: async () => {},
    ...overrides,
  };
}

describe('calculateRepayAmount', () => {
  test('returns partial amount', () => {
    const amount = calculateRepayAmount(1.2, 1.5, '1000000000');
    expect(amount).toBeGreaterThan(0n);
    expect(amount).toBeLessThanOrEqual(BigInt('1000000000'));
  });

  test('caps at max repay', () => {
    const amount = calculateRepayAmount(1.0, 10.0, '100');
    expect(amount).toBeLessThanOrEqual(BigInt('100'));
  });

  test('returns 0 when current >= target', () => {
    expect(calculateRepayAmount(1.5, 1.5, '1000000000')).toBe(0n);
    expect(calculateRepayAmount(2.0, 1.5, '1000000000')).toBe(0n);
  });

  test('returns 0 for invalid inputs', () => {
    expect(calculateRepayAmount(0, 1.5, '1000000000')).toBe(0n);
    expect(calculateRepayAmount(1.2, 0, '1000000000')).toBe(0n);
    expect(calculateRepayAmount(-1, 1.5, '1000000000')).toBe(0n);
  });

  test('returns max when ratio > 1', () => {
    const amount = calculateRepayAmount(0.5, 5.0, '500');
    expect(amount).toBeLessThanOrEqual(BigInt('500'));
  });
});

describe('shouldTrigger', () => {
  test('returns true when HF below threshold', () => {
    const rule = makeRule({ trigger_hf: 13000 });
    expect(shouldTrigger(rule, 1.2)).toBe(true);
  });

  test('returns false when HF above threshold', () => {
    const rule = makeRule({ trigger_hf: 13000 });
    expect(shouldTrigger(rule, 1.5)).toBe(false);
  });

  test('returns true when HF equals threshold', () => {
    const rule = makeRule({ trigger_hf: 13000 });
    expect(shouldTrigger(rule, 1.3)).toBe(true);
  });

  test('returns false for non-active rules', () => {
    expect(shouldTrigger(makeRule({ status: 'paused' }), 1.0)).toBe(false);
    expect(shouldTrigger(makeRule({ status: 'disabled' }), 1.0)).toBe(false);
  });
});

describe('estimatePostRepayHF', () => {
  test('returns higher HF after repay', () => {
    const postHF = estimatePostRepayHF(1.2, 1000000n, 5000000n);
    expect(postHF).toBeGreaterThan(1.2);
  });

  test('returns Infinity when debt is zero', () => {
    expect(estimatePostRepayHF(1.2, 1000000n, 0n)).toBe(Infinity);
  });

  test('returns Infinity when full debt repaid', () => {
    expect(estimatePostRepayHF(1.2, 5000000n, 5000000n)).toBe(Infinity);
  });
});

describe('loadActiveRules', () => {
  test('returns only active rules', async () => {
    const store = new InMemoryAutoRepayStore();
    await store.createRule({
      userAddress: '0x1111111111111111111111111111111111111111',
      triggerHf: 13000,
      targetHf: 15000,
      maxRepayPerExecution: '1000',
    });
    const r2 = await store.createRule({
      userAddress: '0x2222222222222222222222222222222222222222',
      triggerHf: 13000,
      targetHf: 15000,
      maxRepayPerExecution: '1000',
    });
    await store.updateRule(r2.id, { status: 'paused' });

    const active = await loadActiveRules(store);
    expect(active).toHaveLength(1);
    expect(active[0]!.status).toBe('active');
  });
});

describe('checkHealthFactor', () => {
  test('calls fetch function with address', async () => {
    const fetch = vi.fn().mockResolvedValue(1.5);
    const hf = await checkHealthFactor(fetch, '0xabc');
    expect(hf).toBe(1.5);
    expect(fetch).toHaveBeenCalledWith('0xabc');
  });
});

describe('runAutoRepayCycle', () => {
  test('returns zero counts when no rules', async () => {
    const deps = makeDeps();
    const result = await runAutoRepayCycle(deps);
    expect(result.evaluated).toBe(0);
    expect(result.triggered).toBe(0);
    expect(result.repaid).toBe(0);
    expect(result.failed).toBe(0);
  });

  test('evaluates active rules', async () => {
    const store = new InMemoryAutoRepayStore();
    await store.createRule({
      userAddress: '0x1111111111111111111111111111111111111111',
      triggerHf: 13000,
      targetHf: 15000,
      maxRepayPerExecution: '1000000000',
    });
    const deps = makeDeps({ store, fetchHealthFactor: async () => 2.0 });
    const result = await runAutoRepayCycle(deps);
    expect(result.evaluated).toBe(1);
    expect(result.triggered).toBe(0);
  });

  test('triggers repay when HF below threshold', async () => {
    const store = new InMemoryAutoRepayStore();
    await store.createRule({
      userAddress: '0x1111111111111111111111111111111111111111',
      triggerHf: 13000,
      targetHf: 15000,
      maxRepayPerExecution: '1000000000',
    });
    const signAndBroadcast = vi.fn().mockResolvedValue('0xtx1');
    let callCount = 0;
    const deps = makeDeps({
      store,
      fetchHealthFactor: async () => {
        callCount++;
        return callCount === 1 ? 1.2 : 1.5;
      },
      signAndBroadcast,
    });
    const result = await runAutoRepayCycle(deps);
    expect(result.triggered).toBe(1);
    expect(result.repaid).toBe(1);
    expect(signAndBroadcast).toHaveBeenCalled();
  });

  test('respects daily limit', async () => {
    const store = new InMemoryAutoRepayStore();
    const rule = await store.createRule({
      userAddress: '0x1111111111111111111111111111111111111111',
      triggerHf: 13000,
      targetHf: 15000,
      maxRepayPerExecution: '1000000000',
      maxPerDay: 1,
    });
    await store.logExecution({ ruleId: rule.id, status: 'success' });

    const signAndBroadcast = vi.fn().mockResolvedValue('0xtx2');
    const deps = makeDeps({
      store,
      fetchHealthFactor: async () => 1.0,
      signAndBroadcast,
    });
    const result = await runAutoRepayCycle(deps);
    expect(result.triggered).toBe(0);
    expect(result.repaid).toBe(0);
    expect(signAndBroadcast).not.toHaveBeenCalled();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('handles tx failure gracefully', async () => {
    const store = new InMemoryAutoRepayStore();
    await store.createRule({
      userAddress: '0x1111111111111111111111111111111111111111',
      triggerHf: 13000,
      targetHf: 15000,
      maxRepayPerExecution: '1000000000',
    });
    const deps = makeDeps({
      store,
      fetchHealthFactor: async () => 1.0,
      signAndBroadcast: async () => { throw new Error('tx reverted'); },
    });
    const result = await runAutoRepayCycle(deps);
    expect(result.failed).toBe(1);
    expect(result.repaid).toBe(0);
  });

  test('increments failures on tx error', async () => {
    const store = new InMemoryAutoRepayStore();
    const rule = await store.createRule({
      userAddress: '0x1111111111111111111111111111111111111111',
      triggerHf: 13000,
      targetHf: 15000,
      maxRepayPerExecution: '1000000000',
    });
    const deps = makeDeps({
      store,
      fetchHealthFactor: async () => 1.0,
      signAndBroadcast: async () => { throw new Error('fail'); },
    });
    await runAutoRepayCycle(deps);
    const updated = await store.getRuleById(rule.id);
    expect(updated!.consecutive_failures).toBe(1);
  });

  test('resets failures on success', async () => {
    const store = new InMemoryAutoRepayStore();
    const rule = await store.createRule({
      userAddress: '0x1111111111111111111111111111111111111111',
      triggerHf: 13000,
      targetHf: 15000,
      maxRepayPerExecution: '1000000000',
    });
    await store.incrementFailures(rule.id);

    let callCount = 0;
    const deps = makeDeps({
      store,
      fetchHealthFactor: async () => {
        callCount++;
        return callCount === 1 ? 1.0 : 1.5;
      },
    });
    await runAutoRepayCycle(deps);
    const updated = await store.getRuleById(rule.id);
    expect(updated!.consecutive_failures).toBe(0);
  });

  test('pauses rule after max consecutive failures', async () => {
    const store = new InMemoryAutoRepayStore();
    const rule = await store.createRule({
      userAddress: '0x1111111111111111111111111111111111111111',
      triggerHf: 13000,
      targetHf: 15000,
      maxRepayPerExecution: '1000000000',
    });
    await store.incrementFailures(rule.id);
    await store.incrementFailures(rule.id);
    expect((await store.getRuleById(rule.id))!.consecutive_failures).toBe(2);

    const deps = makeDeps({
      store,
      fetchHealthFactor: async () => 1.0,
      signAndBroadcast: async () => { throw new Error('fail'); },
    });
    await runAutoRepayCycle(deps);
    const updated = await store.getRuleById(rule.id);
    expect(updated!.status).toBe('paused');
  });

  test('calls notify on success', async () => {
    const store = new InMemoryAutoRepayStore();
    await store.createRule({
      userAddress: '0x1111111111111111111111111111111111111111',
      triggerHf: 13000,
      targetHf: 15000,
      maxRepayPerExecution: '1000000000',
    });
    const notify = vi.fn().mockResolvedValue(undefined);
    let callCount = 0;
    const deps = makeDeps({
      store,
      fetchHealthFactor: async () => {
        callCount++;
        return callCount === 1 ? 1.0 : 1.5;
      },
      notify,
    });
    await runAutoRepayCycle(deps);
    expect(notify).toHaveBeenCalledWith(
      '0x1111111111111111111111111111111111111111',
      expect.stringContaining('Auto-repay executed'),
    );
  });

  test('logs execution on success', async () => {
    const store = new InMemoryAutoRepayStore();
    const rule = await store.createRule({
      userAddress: '0x1111111111111111111111111111111111111111',
      triggerHf: 13000,
      targetHf: 15000,
      maxRepayPerExecution: '1000000000',
    });
    let callCount = 0;
    const deps = makeDeps({
      store,
      fetchHealthFactor: async () => {
        callCount++;
        return callCount === 1 ? 1.0 : 1.5;
      },
    });
    await runAutoRepayCycle(deps);
    const history = await store.getExecutionHistory(rule.id);
    expect(history).toHaveLength(1);
    expect(history[0]!.status).toBe('success');
  });

  test('logs execution on failure', async () => {
    const store = new InMemoryAutoRepayStore();
    const rule = await store.createRule({
      userAddress: '0x1111111111111111111111111111111111111111',
      triggerHf: 13000,
      targetHf: 15000,
      maxRepayPerExecution: '1000000000',
    });
    const deps = makeDeps({
      store,
      fetchHealthFactor: async () => 1.0,
      signAndBroadcast: async () => { throw new Error('boom'); },
    });
    await runAutoRepayCycle(deps);
    const history = await store.getExecutionHistory(rule.id);
    expect(history).toHaveLength(1);
    expect(history[0]!.status).toBe('failed');
    expect(history[0]!.error_message).toBe('boom');
  });

  test('handles fetchHealthFactor error', async () => {
    const store = new InMemoryAutoRepayStore();
    await store.createRule({
      userAddress: '0x1111111111111111111111111111111111111111',
      triggerHf: 13000,
      targetHf: 15000,
      maxRepayPerExecution: '1000000000',
    });
    const deps = makeDeps({
      store,
      fetchHealthFactor: async () => { throw new Error('rpc down'); },
    });
    const result = await runAutoRepayCycle(deps);
    expect(result.failed).toBe(1);
    expect(result.errors[0]).toContain('rpc down');
  });

  test('processes multiple rules independently', async () => {
    const store = new InMemoryAutoRepayStore();
    await store.createRule({
      userAddress: '0x1111111111111111111111111111111111111111',
      triggerHf: 13000,
      targetHf: 15000,
      maxRepayPerExecution: '1000',
    });
    await store.createRule({
      userAddress: '0x2222222222222222222222222222222222222222',
      triggerHf: 12000,
      targetHf: 14000,
      maxRepayPerExecution: '2000',
    });
    let callCount = 0;
    const deps = makeDeps({
      store,
      fetchHealthFactor: async () => {
        callCount++;
        return callCount % 2 === 1 ? 1.1 : 1.5;
      },
    });
    const result = await runAutoRepayCycle(deps);
    expect(result.evaluated).toBe(2);
    expect(result.repaid).toBe(2);
  });

  test('uses first repay source asset', async () => {
    const store = new InMemoryAutoRepayStore();
    await store.createRule({
      userAddress: '0x1111111111111111111111111111111111111111',
      triggerHf: 13000,
      targetHf: 15000,
      maxRepayPerExecution: '1000000000',
      repaySource: ['dai', 'usdc'],
    });
    const buildRepayTx = vi.fn().mockResolvedValue({ to: '0x', data: '0x', value: '0' });
    let callCount = 0;
    const deps = makeDeps({
      store,
      fetchHealthFactor: async () => {
        callCount++;
        return callCount === 1 ? 1.0 : 1.5;
      },
      buildRepayTx,
    });
    await runAutoRepayCycle(deps);
    expect(buildRepayTx).toHaveBeenCalledWith(
      expect.objectContaining({ repayAsset: 'dai' }),
    );
  });

  test('records tx hash in execution log', async () => {
    const store = new InMemoryAutoRepayStore();
    const rule = await store.createRule({
      userAddress: '0x1111111111111111111111111111111111111111',
      triggerHf: 13000,
      targetHf: 15000,
      maxRepayPerExecution: '1000000000',
    });
    let callCount = 0;
    const deps = makeDeps({
      store,
      fetchHealthFactor: async () => {
        callCount++;
        return callCount === 1 ? 1.0 : 1.5;
      },
      signAndBroadcast: async () => '0xabc123',
    });
    await runAutoRepayCycle(deps);
    const history = await store.getExecutionHistory(rule.id);
    expect(history[0]!.tx_hash).toBe('0xabc123');
  });

  test('skips paused rules', async () => {
    const store = new InMemoryAutoRepayStore();
    await store.createRule({
      userAddress: '0x1111111111111111111111111111111111111111',
      triggerHf: 13000,
      targetHf: 15000,
      maxRepayPerExecution: '1000000000',
      status: 'paused',
    });
    const signAndBroadcast = vi.fn();
    const deps = makeDeps({ store, signAndBroadcast });
    const result = await runAutoRepayCycle(deps);
    expect(result.evaluated).toBe(0);
    expect(signAndBroadcast).not.toHaveBeenCalled();
  });

  test('marks rule as evaluated', async () => {
    const store = new InMemoryAutoRepayStore();
    const rule = await store.createRule({
      userAddress: '0x1111111111111111111111111111111111111111',
      triggerHf: 13000,
      targetHf: 15000,
      maxRepayPerExecution: '1000000000',
    });
    let callCount = 0;
    const deps = makeDeps({
      store,
      fetchHealthFactor: async () => {
        callCount++;
        return callCount === 1 ? 2.0 : 2.0;
      },
    });
    await runAutoRepayCycle(deps);
    const updated = await store.getRuleById(rule.id);
    expect(updated!.last_evaluated_at).not.toBeNull();
  });

  test('post-HF RPC failure does not mark success (P0-6)', async () => {
    const store = new InMemoryAutoRepayStore();
    const rule = await store.createRule({
      userAddress: '0x1111111111111111111111111111111111111111',
      triggerHf: 13000,
      targetHf: 15000,
      maxRepayPerExecution: '1000000000',
    });
    let callCount = 0;
    const deps = makeDeps({
      store,
      // First call (pre-execution): HF=1.2 triggers repay
      // Second call (post-execution): throws RPC error
      fetchHealthFactor: async () => {
        callCount++;
        if (callCount === 1) return 1.2;
        throw new Error('rpc_timeout');
      },
    });
    const result = await runAutoRepayCycle(deps);
    expect(result.repaid).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors[0]).toContain('post_hf_fetch_failed');
    const history = await store.getExecutionHistory(rule.id);
    expect(history[0]?.status).toBe('failed');
    expect(history[0]?.error_message).toContain('post_hf_fetch_failed');
  });

  test('hf_did_not_improve disables rule — no success notification (P0-6, P2-9)', async () => {
    const store = new InMemoryAutoRepayStore();
    const rule = await store.createRule({
      userAddress: '0x1111111111111111111111111111111111111111',
      triggerHf: 13000,
      targetHf: 15000,
      maxRepayPerExecution: '1000000000',
    });
    const notify = vi.fn().mockResolvedValue(undefined);
    const deps = makeDeps({
      store,
      // First call: HF=1.2 triggers; second call: HF=1.2 (unchanged — did not improve)
      fetchHealthFactor: async () => 1.2,
      notify,
    });
    const result = await runAutoRepayCycle(deps);
    expect(result.repaid).toBe(0);
    expect(result.failed).toBe(1);
    const updated = await store.getRuleById(rule.id);
    expect(updated!.status).toBe('paused');
    // Must notify anomaly, must NOT notify success
    expect(notify).toHaveBeenCalledWith(
      '0x1111111111111111111111111111111111111111',
      expect.stringContaining('paused'),
    );
    expect(notify).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('Auto-repay executed'),
    );
  });
});
