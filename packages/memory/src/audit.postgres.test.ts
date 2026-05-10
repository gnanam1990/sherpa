import { describe, it, expect, beforeEach } from 'vitest';
import type pg from 'pg';
import {
  createPostgresAuditStore,
  ConcurrentAuditUpdate,
  AuditRowNotFound,
} from './audit.postgres.js';

type Call = { sql: string; params: unknown[]; reply: { rows: unknown[]; rowCount: number } };

/** Tiny in-memory pg.Pool stub. Each test scripts the queue of replies. */
function makePool(replies: Array<{ rows: unknown[]; rowCount?: number }>) {
  const calls: Call[] = [];
  let i = 0;
  const pool = {
    async query(sql: string, params: unknown[] = []) {
      const reply = replies[i++];
      if (!reply) throw new Error(`unexpected query: ${sql}`);
      const r = { rows: reply.rows, rowCount: reply.rowCount ?? reply.rows.length };
      calls.push({ sql: sql.trim(), params, reply: r });
      return r;
    },
  } as unknown as pg.Pool;
  return { pool, calls };
}

const user = '0x0000000000000000000000000000000000000abc' as const;

describe('audit.postgres / create', () => {
  it('inserts and returns numeric id', async () => {
    const { pool, calls } = makePool([{ rows: [{ id: '42' }] }]);
    const store = createPostgresAuditStore(pool);
    const id = await store.create({
      userAddress: user,
      intent: 'SEND',
      planHash: '0xdead',
      submittedAt: 1700000000000,
      surface: 'api',
      rawInput: 'send 1 USDC',
      parsedIntent: { intent: 'SEND', amount: '1' },
      plan: { steps: [] },
    });
    expect(id).toBe(42);
    expect(calls[0]!.sql.startsWith('INSERT INTO audit_log')).toBe(true);
    expect(calls[0]!.params[0]).toBe(user);
    expect(calls[0]!.params[1]).toBe('api');
    expect(calls[0]!.params[2]).toBe('send 1 USDC');
    expect(calls[0]!.params[3]).toBe('SEND');
    expect(calls[0]!.params[8]).toBeInstanceOf(Date);
  });

  it('defaults surface=api and rawInput=empty when omitted', async () => {
    const { pool, calls } = makePool([{ rows: [{ id: 7 }] }]);
    const store = createPostgresAuditStore(pool);
    await store.create({
      userAddress: user,
      intent: 'SEND',
      planHash: '0x1',
      submittedAt: 1,
    });
    expect(calls[0]!.params[1]).toBe('api');
    expect(calls[0]!.params[2]).toBe('');
  });

  it('throws if RETURNING produced no row', async () => {
    const { pool } = makePool([{ rows: [] }]);
    const store = createPostgresAuditStore(pool);
    await expect(
      store.create({ userAddress: user, intent: 'SEND', planHash: '0x1', submittedAt: 1 }),
    ).rejects.toThrow(/no id/);
  });
});

describe('audit.postgres / update', () => {
  let now: Date;
  beforeEach(() => {
    now = new Date('2026-05-11T00:00:00Z');
  });

  it('appends a single tx_hash via array_append', async () => {
    const { pool, calls } = makePool([
      { rows: [{ updated_at: now }] },
      { rows: [], rowCount: 1 },
    ]);
    const store = createPostgresAuditStore(pool);
    await store.update(7, { txHash: '0xbeef' });
    expect(calls[1]!.sql).toContain('array_append');
    expect(calls[1]!.params).toEqual([7, now, '0xbeef']);
  });

  it('replaces tx_hashes wholesale when txHashes provided', async () => {
    const { pool, calls } = makePool([
      { rows: [{ updated_at: now }] },
      { rows: [], rowCount: 1 },
    ]);
    const store = createPostgresAuditStore(pool);
    await store.update(7, { txHashes: ['0xa', '0xb'] as `0x${string}`[] });
    expect(calls[1]!.sql).toContain('tx_hashes = $3');
    expect(calls[1]!.sql).not.toContain('array_append');
    expect(calls[1]!.params[2]).toEqual(['0xa', '0xb']);
  });

  it('writes status, error_detail, confirmed_at, executed_steps', async () => {
    const { pool, calls } = makePool([
      { rows: [{ updated_at: now }] },
      { rows: [], rowCount: 1 },
    ]);
    const store = createPostgresAuditStore(pool);
    await store.update(7, {
      status: 'failed',
      error: 'rpc down',
      confirmedAt: 1700000000000,
      executedSteps: { step: 'fail' },
    });
    const sql = calls[1]!.sql;
    expect(sql).toContain('status = $');
    expect(sql).toContain('error_detail = $');
    expect(sql).toContain('confirmed_at = $');
    expect(sql).toContain('executed_steps = $');
  });

  it('throws AuditRowNotFound when SELECT returns nothing', async () => {
    const { pool } = makePool([{ rows: [] }]);
    const store = createPostgresAuditStore(pool);
    await expect(store.update(99, { error: 'x' })).rejects.toBeInstanceOf(AuditRowNotFound);
  });

  it('throws ConcurrentAuditUpdate when UPDATE rowCount is 0', async () => {
    const { pool } = makePool([
      { rows: [{ updated_at: now }] },
      { rows: [], rowCount: 0 },
    ]);
    const store = createPostgresAuditStore(pool);
    await expect(store.update(7, { error: 'x' })).rejects.toBeInstanceOf(ConcurrentAuditUpdate);
  });
});

describe('audit.postgres / list + snapshot', () => {
  it('lists rows for a user (case-insensitive) and maps tx_hashes -> patch', async () => {
    const submittedAt = new Date('2026-05-10T00:00:00Z');
    const updatedAt = new Date('2026-05-10T01:00:00Z');
    const { pool, calls } = makePool([
      {
        rows: [
          {
            id: 1,
            user_address: user,
            surface: 'api',
            raw_input: 'send 1',
            intent: 'SEND',
            plan_hash: '0xabc',
            parsed_intent: null,
            plan: null,
            executed_steps: null,
            tx_hashes: ['0xbeef'],
            status: 'success',
            error_detail: null,
            submitted_at: submittedAt,
            confirmed_at: updatedAt,
            updated_at: updatedAt,
          },
        ],
      },
    ]);
    const store = createPostgresAuditStore(pool);
    const rows = await store.list(user.toUpperCase() as `0x${string}`);
    expect(rows.length).toBe(1);
    expect(rows[0]!.patch.txHash).toBe('0xbeef');
    expect(rows[0]!.patch.txHashes).toEqual(['0xbeef']);
    expect(rows[0]!.patch.status).toBe('success');
    expect(calls[0]!.sql).toContain('LOWER(user_address) = LOWER($1)');
  });

  it('snapshot counts rows with non-empty tx_hashes', async () => {
    const { pool } = makePool([{ rows: [{ tx_count: 3 }] }]);
    const store = createPostgresAuditStore(pool);
    const snap = await store.snapshot(user);
    expect(snap.txCount).toBe(3);
    expect(snap.address).toBe(user);
  });

  it('snapshot returns 0 when empty', async () => {
    const { pool } = makePool([{ rows: [] }]);
    const store = createPostgresAuditStore(pool);
    const snap = await store.snapshot(user);
    expect(snap.txCount).toBe(0);
  });
});
