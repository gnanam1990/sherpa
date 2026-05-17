import { describe, test, expect, vi } from 'vitest';
import { createAutoRepayRunner, runAutoRepayWorkerCycle } from './auto-repay-runner.js';
import { InMemoryAutoRepayStore } from '@sherpa/memory';

describe('auto-repay-runner (worker)', () => {
  test('createAutoRepayRunner returns runner with store and deps', () => {
    const runner = createAutoRepayRunner();
    expect(runner.store).toBeDefined();
    expect(runner.deps).toBeDefined();
    expect(runner.runOnce).toBeDefined();
  });

  test('runOnce returns cycle result', async () => {
    const runner = createAutoRepayRunner();
    const result = await runner.runOnce();
    expect(result).toHaveProperty('evaluated');
    expect(result).toHaveProperty('triggered');
    expect(result).toHaveProperty('repaid');
    expect(result).toHaveProperty('failed');
    expect(result).toHaveProperty('errors');
  });

  test('default transaction dependencies fail closed instead of faking a tx', async () => {
    const store = new InMemoryAutoRepayStore();
    const rule = await store.createRule({
      userAddress: '0x1111111111111111111111111111111111111111',
      triggerHf: 13000,
      targetHf: 15000,
      maxRepayPerExecution: '1000000000',
    });
    const runner = createAutoRepayRunner({
      store,
      fetchHealthFactor: async () => 1.0,
    });

    const result = await runner.runOnce();

    expect(result.triggered).toBe(1);
    expect(result.repaid).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors.join('\n')).toContain('auto_repay_executor_not_configured');
    const executions = await store.getExecutionHistory(rule.id);
    expect(executions[0]?.status).toBe('failed');
    expect(executions[0]?.tx_hash).toBeNull();
  });

  test('runOnce processes rules from store', async () => {
    const store = new InMemoryAutoRepayStore();
    await store.createRule({
      userAddress: '0x1111111111111111111111111111111111111111',
      triggerHf: 13000,
      targetHf: 15000,
      maxRepayPerExecution: '1000000000',
    });
    let callCount = 0;
    const runner = createAutoRepayRunner({
      store,
      fetchHealthFactor: async () => {
        callCount++;
        return callCount === 1 ? 1.2 : 1.5;
      },
      signAndBroadcast: async () => '0xtx1',
      buildRepayTx: async () => ({ to: '0x', data: '0x', value: '0' }),
    });
    const result = await runner.runOnce();
    expect(result.evaluated).toBe(1);
    expect(result.repaid).toBe(1);
  });

  test('runAutoRepayWorkerCycle works with overrides', async () => {
    const store = new InMemoryAutoRepayStore();
    const result = await runAutoRepayWorkerCycle(store, {
      fetchHealthFactor: async () => 2.0,
    });
    expect(result.evaluated).toBe(0);
  });

  test('runner uses custom notify', async () => {
    const store = new InMemoryAutoRepayStore();
    await store.createRule({
      userAddress: '0x1111111111111111111111111111111111111111',
      triggerHf: 13000,
      targetHf: 15000,
      maxRepayPerExecution: '1000000000',
    });
    const notify = vi.fn().mockResolvedValue(undefined);
    let callCount = 0;
    const runner = createAutoRepayRunner({
      store,
      fetchHealthFactor: async () => {
        callCount++;
        return callCount === 1 ? 1.0 : 1.5;
      },
      signAndBroadcast: async () => '0xtx',
      buildRepayTx: async () => ({ to: '0x', data: '0x', value: '0' }),
      notify,
    });
    await runner.runOnce();
    expect(notify).toHaveBeenCalled();
  });
});
