import { describe, test, expect, beforeEach } from 'vitest';
import {
  InMemorySessionKeyStore,
  type CreateSessionKeyParams,
  type SessionKeyStore,
} from './session-keys.js';

function makeParams(overrides: Partial<CreateSessionKeyParams> = {}): CreateSessionKeyParams {
  return {
    ownerAddress: '0x1111111111111111111111111111111111111111',
    sessionKeyAddress: '0x2222222222222222222222222222222222222222',
    chainId: 8453,
    permissions: [{ target: '0xaaaa', selector: '0x12345678', maxValue: '1000' }],
    scope: [{ target: '0xaaaa', functions: ['0x12345678'] }],
    limits: { perTxValue: '500', dailyTotal: '2000' },
    spendLimit: '10000',
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 86400000),
    ...overrides,
  };
}

describe('InMemorySessionKeyStore', () => {
  let store: SessionKeyStore;

  beforeEach(() => {
    store = new InMemorySessionKeyStore();
  });

  test('creates a session key', async () => {
    const key = await store.create(makeParams());
    expect(key.id).toBeDefined();
    expect(key.status).toBe('active');
    expect(key.spent_amount).toBe('0');
    expect(key.execution_count).toBe(0);
  });

  test('getById returns created key', async () => {
    const key = await store.create(makeParams());
    const found = await store.getById(key.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(key.id);
  });

  test('getById returns null for unknown id', async () => {
    const found = await store.getById('nonexistent');
    expect(found).toBeNull();
  });

  test('getActiveByOwner returns active keys', async () => {
    await store.create(makeParams());
    const keys = await store.getActiveByOwner('0x1111111111111111111111111111111111111111');
    expect(keys).toHaveLength(1);
  });

  test('getActiveByOwner excludes revoked keys', async () => {
    const key = await store.create(makeParams());
    await store.updateStatus(key.id, 'revoked');
    const keys = await store.getActiveByOwner('0x1111111111111111111111111111111111111111');
    expect(keys).toHaveLength(0);
  });

  test('getActiveByOwner excludes expired keys', async () => {
    await store.create(
      makeParams({ validUntil: new Date(Date.now() - 1000) }),
    );
    const keys = await store.getActiveByOwner('0x1111111111111111111111111111111111111111');
    expect(keys).toHaveLength(0);
  });

  test('getByOwner returns all keys regardless of status', async () => {
    const key = await store.create(makeParams());
    await store.create(makeParams());
    await store.updateStatus(key.id, 'revoked');
    const keys = await store.getByOwner('0x1111111111111111111111111111111111111111');
    expect(keys).toHaveLength(2);
  });

  test('updateStatus changes key status', async () => {
    const key = await store.create(makeParams());
    await store.updateStatus(key.id, 'revoked');
    const found = await store.getById(key.id);
    expect(found!.status).toBe('revoked');
  });

  test('updateLimits merges with existing limits', async () => {
    const key = await store.create(makeParams());
    await store.updateLimits(key.id, { dailyTotal: '5000' });
    const found = await store.getById(key.id);
    expect(found!.limits.dailyTotal).toBe('5000');
    expect(found!.limits.perTxValue).toBe('500');
  });

  test('incrementSpent updates spent amount', async () => {
    const key = await store.create(makeParams());
    await store.incrementSpent(key.id, '500');
    const found = await store.getById(key.id);
    expect(found!.spent_amount).toBe('500');
    expect(found!.execution_count).toBe(1);
  });

  test('incrementSpent marks exhausted when max reached', async () => {
    const key = await store.create(makeParams({ maxExecutions: 2 }));
    await store.incrementSpent(key.id, '100');
    await store.incrementSpent(key.id, '100');
    const found = await store.getById(key.id);
    expect(found!.status).toBe('exhausted');
  });

  test('logExecution creates execution record', async () => {
    const key = await store.create(makeParams());
    const exec = await store.logExecution({
      sessionKeyId: key.id,
      target: '0xaaaa',
      selector: '0x12345678',
      value: '500',
      status: 'success',
      txHash: '0xtx1',
      gasUsed: '21000',
    });
    expect(exec.id).toBeDefined();
    expect(exec.status).toBe('success');
  });

  test('getUsageStats returns correct totals', async () => {
    const key = await store.create(makeParams());
    await store.logExecution({
      sessionKeyId: key.id,
      target: '0xaaaa',
      selector: '0x12345678',
      value: '100',
      status: 'success',
      gasUsed: '21000',
    });
    await store.logExecution({
      sessionKeyId: key.id,
      target: '0xaaaa',
      selector: '0x12345678',
      value: '200',
      status: 'success',
      gasUsed: '42000',
    });
    const stats = await store.getUsageStats(key.id);
    expect(stats.totalTransactions).toBe(2);
    expect(stats.totalGasUsed).toBe('63000');
    expect(stats.totalValueTransacted).toBe('300');
  });

  test('getUsageStats groups by day', async () => {
    const key = await store.create(makeParams());
    await store.logExecution({
      sessionKeyId: key.id,
      target: '0xaaaa',
      selector: '0x12345678',
      value: '100',
      status: 'success',
    });
    const stats = await store.getUsageStats(key.id);
    expect(stats.dailyUsage.length).toBeGreaterThanOrEqual(1);
  });

  test('getUsageStats throws for unknown key', async () => {
    await expect(store.getUsageStats('nonexistent')).rejects.toThrow('not found');
  });

  test('getExecutionsByKeyId returns executions', async () => {
    const key = await store.create(makeParams());
    await store.logExecution({
      sessionKeyId: key.id,
      target: '0xaaaa',
      selector: '0x12345678',
      value: '100',
      status: 'success',
    });
    const execs = await store.getExecutionsByKeyId(key.id);
    expect(execs).toHaveLength(1);
  });

  test('getExecutionsByKeyId respects limit', async () => {
    const key = await store.create(makeParams());
    for (let i = 0; i < 5; i++) {
      await store.logExecution({
        sessionKeyId: key.id,
        target: '0xaaaa',
        selector: '0x12345678',
        value: '100',
        status: 'success',
      });
    }
    const execs = await store.getExecutionsByKeyId(key.id, 3);
    expect(execs).toHaveLength(3);
  });

  test('cleanupExpired marks expired keys', async () => {
    await store.create(makeParams({ validUntil: new Date(Date.now() - 1000) }));
    await store.create(makeParams({ validUntil: new Date(Date.now() + 86400000) }));
    const count = await store.cleanupExpired();
    expect(count).toBe(1);
  });

  test('cleanupExpired returns 0 when nothing to clean', async () => {
    await store.create(makeParams());
    const count = await store.cleanupExpired();
    expect(count).toBe(0);
  });
});
