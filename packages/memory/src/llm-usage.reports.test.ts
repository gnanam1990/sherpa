import { describe, it, expect } from 'vitest';
import type pg from 'pg';
import { fetchTodayUsage, fetchUserUsage } from './llm-usage.reports.js';

type Call = { sql: string; params: unknown[] };

function makePool(replies: Array<{ rows: unknown[] }>) {
  const calls: Call[] = [];
  let i = 0;
  const pool = {
    async query(sql: string, params: unknown[] = []) {
      const reply = replies[i++];
      if (!reply) throw new Error(`unexpected query: ${sql}`);
      calls.push({ sql: sql.trim(), params });
      return { rows: reply.rows, rowCount: reply.rows.length };
    },
  } as unknown as pg.Pool;
  return { pool, calls };
}

describe('llm-usage.reports / fetchTodayUsage', () => {
  it('aggregates GROUP BY task,provider into total + byTask + byProvider', async () => {
    const { pool } = makePool([
      {
        rows: [
          { task: 'parse', provider: 'gpt-4o-mini', cost: '1.000000' },
          { task: 'parse', provider: 'groq-llama', cost: '0.500000' },
          { task: 'narration', provider: 'claude-haiku', cost: '2.250000' },
        ],
      },
    ]);
    const r = await fetchTodayUsage(pool);
    expect(r.totalUsd).toBeCloseTo(3.75, 6);
    expect(r.byTask).toEqual({ parse: 1.5, narration: 2.25 });
    expect(r.byProvider).toEqual({
      'gpt-4o-mini': 1,
      'groq-llama': 0.5,
      'claude-haiku': 2.25,
    });
  });

  it('uses date_trunc on both sides — keeps the today filter server-side (regression: PR #10 µs/ms class)', async () => {
    const { pool, calls } = makePool([{ rows: [] }]);
    await fetchTodayUsage(pool);
    const sql = calls[0]!.sql;
    expect(sql).toMatch(/date_trunc\('day',\s*created_at\)/);
    expect(sql).toMatch(/date_trunc\('day',\s*NOW\(\)\)/);
    expect(sql).toContain('GROUP BY task, provider');
    expect(calls[0]!.params).toEqual([]);
  });

  it('returns zeroes when no rows today', async () => {
    const { pool } = makePool([{ rows: [] }]);
    const r = await fetchTodayUsage(pool);
    expect(r).toEqual({ totalUsd: 0, byTask: {}, byProvider: {} });
  });

  it('parses NUMERIC strings (pg returns NUMERIC as string) — never lex-compares', async () => {
    const { pool } = makePool([
      { rows: [{ task: 'parse', provider: 'g', cost: '0.000123' }] },
    ]);
    const r = await fetchTodayUsage(pool);
    expect(typeof r.totalUsd).toBe('number');
    expect(r.totalUsd).toBeCloseTo(0.000123, 7);
  });
});

describe('llm-usage.reports / fetchUserUsage', () => {
  const user = '0x0000000000000000000000000000000000000abc' as const;

  it('returns LIMIT 100 rows ORDER BY created_at DESC, case-insensitive on user_address', async () => {
    const created = new Date('2026-05-13T10:00:00Z');
    const { pool, calls } = makePool([
      {
        rows: [
          {
            id: '1',
            user_address: user,
            task: 'parse',
            provider: 'gpt-4o-mini',
            model: 'gpt-4o-mini',
            prompt_tokens: 100,
            completion_tokens: 20,
            cost_usd: '0.000050',
            latency_ms: 200,
            created_at: created,
          },
        ],
      },
    ]);
    const rows = await fetchUserUsage(pool, user.toUpperCase());
    expect(rows.length).toBe(1);
    expect(rows[0]!.id).toBe(1);
    expect(rows[0]!.costUsd).toBeCloseTo(0.00005, 7);
    expect(rows[0]!.createdAt).toBe(created.getTime());
    expect(calls[0]!.sql).toContain('LOWER(user_address) = LOWER($1)');
    expect(calls[0]!.sql).toContain('LIMIT $2');
    expect(calls[0]!.params).toEqual([user.toUpperCase(), 100]);
  });

  it('honours an explicit limit override', async () => {
    const { pool, calls } = makePool([{ rows: [] }]);
    await fetchUserUsage(pool, user, 25);
    expect(calls[0]!.params[1]).toBe(25);
  });
});
