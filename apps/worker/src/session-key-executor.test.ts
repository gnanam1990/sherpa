import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
  executeWithSessionKey,
  cleanupExpiredKeys,
  type ExecutorDeps,
  type TxRequest,
  type SessionKeyStore,
  type SessionKeyRecord,
} from './session-key-executor.js';

class TestSessionKeyStore implements SessionKeyStore {
  private keys = new Map<string, SessionKeyRecord>();
  private execs = new Map<string, any[]>();

  async create(params: any): Promise<SessionKeyRecord> {
    const id = crypto.randomUUID();
    const record: SessionKeyRecord = {
      id,
      owner_address: params.ownerAddress,
      session_key_address: params.sessionKeyAddress,
      chain_id: params.chainId,
      permissions: params.permissions,
      scope: params.scope ?? [],
      limits: params.limits ?? {},
      spend_limit: params.spendLimit,
      spent_amount: '0',
      valid_from: params.validFrom.toISOString(),
      valid_until: params.validUntil.toISOString(),
      max_executions: params.maxExecutions ?? 1000,
      execution_count: 0,
      status: 'active',
      created_at: new Date().toISOString(),
    };
    this.keys.set(id, record);
    this.execs.set(id, []);
    return record;
  }

  async getById(id: string) {
    return this.keys.get(id) ?? null;
  }
  async getActiveByOwner(addr: string) {
    const now = new Date();
    return [...this.keys.values()].filter(
      (k) => k.owner_address === addr && k.status === 'active' && new Date(k.valid_until) > now,
    );
  }
  async getByOwner(addr: string) {
    return [...this.keys.values()].filter((k) => k.owner_address === addr);
  }
  async updateStatus(id: string, status: string) {
    const k = this.keys.get(id);
    if (k) k.status = status;
  }
  async updateLimits(id: string, limits: any) {
    const k = this.keys.get(id);
    if (k) k.limits = { ...k.limits, ...limits };
  }
  async incrementSpent(id: string, amount: string) {
    const k = this.keys.get(id);
    if (k) {
      k.spent_amount = (BigInt(k.spent_amount) + BigInt(amount)).toString();
      k.execution_count += 1;
      if (k.execution_count >= k.max_executions) k.status = 'exhausted';
    }
  }
  async logExecution(params: any) {
    const id = crypto.randomUUID();
    const rec = { id, ...params, executed_at: new Date().toISOString() };
    const list = this.execs.get(params.sessionKeyId) ?? [];
    list.push(rec);
    this.execs.set(params.sessionKeyId, list);
    return rec;
  }
  async getUsageStats() {
    return {};
  }
  async getExecutionsByKeyId(id: string, limit = 50) {
    return (this.execs.get(id) ?? []).slice(-limit);
  }
  async cleanupExpired() {
    const now = new Date();
    let count = 0;
    for (const [, k] of this.keys) {
      if (k.status === 'active' && new Date(k.valid_until) <= now) {
        k.status = 'expired';
        count++;
      }
    }
    return count;
  }
}

function makeTx(overrides: Partial<TxRequest> = {}): TxRequest {
  return {
    to: '0xaaaa',
    data: '0x123456780000000000000000000000000000000000000000000000000000000000000064',
    value: '100',
    ...overrides,
  };
}

function makeDeps(store: SessionKeyStore): ExecutorDeps {
  return {
    store,
    signTx: vi.fn().mockResolvedValue('0xsigned'),
    broadcastTx: vi.fn().mockResolvedValue('0xtxhash'),
    getGasUsed: vi.fn().mockResolvedValue('21000'),
  };
}

async function createTestKey(store: TestSessionKeyStore, overrides: Record<string, unknown> = {}) {
  return store.create({
    ownerAddress: '0x1111111111111111111111111111111111111111',
    sessionKeyAddress: '0x2222222222222222222222222222222222222222',
    chainId: 8453,
    permissions: [{ target: '0xaaaa', selector: '0x12345678', maxValue: '1000' }],
    scope: [{ target: '0xaaaa', functions: ['0x12345678'] }],
    limits: { perTxValue: '500', dailyTotal: '2000' },
    spendLimit: '10000',
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 86400000),
    maxExecutions: 100,
    ...overrides,
  });
}

describe('executeWithSessionKey', () => {
  let store: TestSessionKeyStore;

  beforeEach(() => {
    store = new TestSessionKeyStore();
  });

  test('executes valid transaction successfully', async () => {
    const key = await createTestKey(store);
    const deps = makeDeps(store);
    const result = await executeWithSessionKey(key, makeTx(), deps);

    expect(result.ok).toBe(true);
    expect(result.txHash).toBe('0xtxhash');
    expect(result.gasUsed).toBe('21000');
  });

  test('calls signTx and broadcastTx', async () => {
    const key = await createTestKey(store);
    const deps = makeDeps(store);
    await executeWithSessionKey(key, makeTx(), deps);

    expect(deps.signTx).toHaveBeenCalledWith(key.session_key_address, expect.any(Object));
    expect(deps.broadcastTx).toHaveBeenCalledWith('0xsigned');
  });

  test('rejects revoked key', async () => {
    const key = await createTestKey(store);
    await store.updateStatus(key.id, 'revoked');
    const revoked = (await store.getById(key.id))!;
    const deps = makeDeps(store);
    const result = await executeWithSessionKey(revoked, makeTx(), deps);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('revoked');
  });

  test('rejects expired key', async () => {
    const key = await createTestKey(store, {
      validUntil: new Date(Date.now() - 1000),
    });
    const deps = makeDeps(store);
    const result = await executeWithSessionKey(key, makeTx(), deps);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('expired');
  });

  test('rejects target not in whitelist', async () => {
    const key = await createTestKey(store);
    const deps = makeDeps(store);
    const result = await executeWithSessionKey(key, makeTx({ to: '0xbbbb' }), deps);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('not in permission whitelist');
  });

  test('rejects value exceeding per-call limit', async () => {
    const key = await createTestKey(store);
    const deps = makeDeps(store);
    const result = await executeWithSessionKey(key, makeTx({ value: '2000' }), deps);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('exceeds per-call limit');
  });

  test('rejects when daily limit exceeded', async () => {
    const key = await createTestKey(store, { limits: { dailyTotal: '200' } });
    const deps = makeDeps(store);
    deps.getTodayUsage = async () => ({ spent: '150', executions: 3 });

    const result = await executeWithSessionKey(key, makeTx({ value: '100' }), deps);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('Daily limit');
  });

  test('rejects when execution limit reached', async () => {
    const key = await createTestKey(store, { maxExecutions: 1 });
    await store.incrementSpent(key.id, '100');
    const exhausted = (await store.getById(key.id))!;
    const deps = makeDeps(store);
    const result = await executeWithSessionKey(exhausted, makeTx(), deps);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('exhausted');
  });

  test('handles broadcast failure gracefully', async () => {
    const key = await createTestKey(store);
    const deps = makeDeps(store);
    deps.broadcastTx = vi.fn().mockRejectedValue(new Error('nonce too low'));

    const result = await executeWithSessionKey(key, makeTx(), deps);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('nonce too low');
  });

  test('logs failed execution on validation error', async () => {
    const key = await createTestKey(store);
    await store.updateStatus(key.id, 'revoked');
    const revoked = (await store.getById(key.id))!;
    const deps = makeDeps(store);
    await executeWithSessionKey(revoked, makeTx(), deps);

    const execs = await store.getExecutionsByKeyId(key.id);
    expect(execs.length).toBe(1);
    expect(execs[0].status).toBe('failed');
  });

  test('rejects selector mismatch', async () => {
    const key = await createTestKey(store);
    const deps = makeDeps(store);
    const result = await executeWithSessionKey(
      key,
      makeTx({ data: '0xdeadbeef' }),
      deps,
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain('not permitted');
  });
});

describe('cleanupExpiredKeys', () => {
  test('marks expired keys', async () => {
    const store = new TestSessionKeyStore();
    await createTestKey(store, { validUntil: new Date(Date.now() - 1000) });
    await createTestKey(store, { validUntil: new Date(Date.now() + 86400000) });

    const count = await cleanupExpiredKeys(store);
    expect(count).toBe(1);
  });

  test('returns 0 when nothing expired', async () => {
    const store = new TestSessionKeyStore();
    await createTestKey(store);

    const count = await cleanupExpiredKeys(store);
    expect(count).toBe(0);
  });
});
