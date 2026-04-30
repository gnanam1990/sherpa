import { describe, it, expect } from 'vitest';
import {
  createAuditLog,
  createInMemoryAuditStore,
  createInMemoryRateLimiter,
  updateAuditLog,
} from './index.js';

const user = '0x0000000000000000000000000000000000000001' as const;

describe('memory/audit', () => {
  it('creates and updates rows via the default store', async () => {
    const id = await createAuditLog({
      userAddress: user,
      intent: 'SEND',
      planHash: '0xdead',
      submittedAt: 1,
    });
    await expect(updateAuditLog(id, { txHash: '0xbeef' })).resolves.toBeUndefined();
  });

  it('injectable store supports listing and snapshotting', async () => {
    const store = createInMemoryAuditStore();
    const id = await createAuditLog(
      { userAddress: user, intent: 'SEND', planHash: '0x1', submittedAt: 1 },
      store,
    );
    await updateAuditLog(id, { txHash: '0xabc' }, store);
    const rows = await store.list(user);
    expect(rows.length).toBe(1);
    const snap = await store.snapshot(user);
    expect(snap.txCount).toBe(1);
  });
});

describe('memory/ratelimit', () => {
  it('allows up to `limit` requests per window', async () => {
    const rl = createInMemoryRateLimiter(() => 1000);
    const a = await rl.check('k', 2, 60);
    const b = await rl.check('k', 2, 60);
    const c = await rl.check('k', 2, 60);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(c.ok).toBe(false);
  });
});
