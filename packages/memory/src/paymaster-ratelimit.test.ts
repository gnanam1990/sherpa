import { describe, it, expect } from 'vitest';
import type pg from 'pg';
import {
  createInMemoryPaymasterRateLimiter,
  createPostgresPaymasterRateLimiter,
} from './paymaster-ratelimit.js';

type Call = { sql: string; params: unknown[] };

function makePool(replies: Array<{ rows: unknown[]; rowCount?: number }>) {
  const calls: Call[] = [];
  let i = 0;
  const pool = {
    async query(sql: string, params: unknown[] = []) {
      const reply = replies[i++];
      if (!reply) throw new Error(`unexpected query: ${sql}`);
      calls.push({ sql: sql.trim(), params });
      return { rows: reply.rows, rowCount: reply.rowCount ?? reply.rows.length };
    },
  } as unknown as pg.Pool;
  return { pool, calls };
}

describe('in-memory paymaster rate limiter', () => {
  it('allows up to limit then denies, and refund frees a slot', async () => {
    const rl = createInMemoryPaymasterRateLimiter({ limit: 2, windowMs: 60_000 });
    const a = await rl.consume('0xabc');
    expect(a.ok).toBe(true);
    expect(a.ok && a.remaining).toBe(1);
    const b = await rl.consume('0xabc');
    expect(b.ok && b.remaining).toBe(0);
    const c = await rl.consume('0xabc');
    expect(c.ok).toBe(false);
    expect(c.resetAt).toBeGreaterThan(Date.now());

    await rl.refund('0xabc');
    const d = await rl.consume('0xabc');
    expect(d.ok).toBe(true);
  });

  it('lowercases addresses so 0xABC and 0xabc share the same bucket', async () => {
    const rl = createInMemoryPaymasterRateLimiter({ limit: 1, windowMs: 60_000 });
    const upper = await rl.consume('0xABCDEF0123456789ABCDEF0123456789ABCDEF01');
    expect(upper.ok).toBe(true);
    const lower = await rl.consume('0xabcdef0123456789abcdef0123456789abcdef01');
    expect(lower.ok).toBe(false);
  });

  it('rolls the window after windowMs elapses', async () => {
    let t = 1_000_000;
    const rl = createInMemoryPaymasterRateLimiter({
      limit: 1,
      windowMs: 1000,
      now: () => t,
    });
    expect((await rl.consume('0xabc')).ok).toBe(true);
    expect((await rl.consume('0xabc')).ok).toBe(false);
    t += 1001;
    const fresh = await rl.consume('0xabc');
    expect(fresh.ok).toBe(true);
    expect(fresh.ok && fresh.remaining).toBe(0);
  });
});

describe('postgres paymaster rate limiter', () => {
  it('INSERTs on first call and returns remaining = limit - 1', async () => {
    const { pool, calls } = makePool([
      { rows: [] }, // SELECT — no existing row
      { rows: [], rowCount: 1 }, // INSERT
    ]);
    const rl = createPostgresPaymasterRateLimiter(pool, { limit: 3 });
    const r = await rl.consume('0xABC');
    expect(r.ok).toBe(true);
    expect(r.ok && r.remaining).toBe(2);
    expect(calls[0]!.params).toEqual(['0xabc']); // lowercased
    expect(calls[0]!.sql).toContain('FROM paymaster_ratelimit');
    expect(calls[1]!.sql).toContain('INSERT INTO paymaster_ratelimit');
    // Date arithmetic stays server-side via date_trunc('milliseconds', NOW()) —
    // see spend-cap.postgres for the precedent this mirrors.
    expect(calls[1]!.sql).toContain(`date_trunc('milliseconds', NOW())`);
  });

  it('UPDATEs count when inside the window and returns proper remaining', async () => {
    const recent = new Date(Date.now() - 5000);
    const { pool, calls } = makePool([
      { rows: [{ count: 1, window_start: recent }] },
      { rows: [], rowCount: 1 },
    ]);
    const rl = createPostgresPaymasterRateLimiter(pool, { limit: 3 });
    const r = await rl.consume('0xabc');
    expect(r.ok && r.remaining).toBe(1);
    expect(calls[1]!.sql).toContain('SET count = count + 1');
  });

  it('does NOT write when at the limit — returns ok:false', async () => {
    const recent = new Date(Date.now() - 5000);
    const { pool, calls } = makePool([
      { rows: [{ count: 3, window_start: recent }] },
    ]);
    const rl = createPostgresPaymasterRateLimiter(pool, { limit: 3 });
    const r = await rl.consume('0xabc');
    expect(r.ok).toBe(false);
    expect(calls.length).toBe(1); // single SELECT, no follow-up write
  });

  it('resets count and window when prior row is older than windowMs', async () => {
    const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const { pool, calls } = makePool([
      { rows: [{ count: 3, window_start: old }] },
      { rows: [], rowCount: 1 },
    ]);
    const rl = createPostgresPaymasterRateLimiter(pool, {
      limit: 3,
      windowMs: 24 * 60 * 60 * 1000,
    });
    const r = await rl.consume('0xabc');
    expect(r.ok && r.remaining).toBe(2);
    expect(calls[1]!.sql).toContain('SET count = 1');
    expect(calls[1]!.sql).toContain('window_start = date_trunc');
  });

  it('refund clamps at zero via GREATEST', async () => {
    const { pool, calls } = makePool([{ rows: [], rowCount: 1 }]);
    const rl = createPostgresPaymasterRateLimiter(pool);
    await rl.refund('0xABC');
    expect(calls[0]!.sql).toContain('GREATEST(count - 1, 0)');
    expect(calls[0]!.params).toEqual(['0xabc']);
  });
});
