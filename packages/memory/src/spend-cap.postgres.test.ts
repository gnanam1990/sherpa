import { describe, it, expect } from 'vitest';
import type pg from 'pg';
import { LLMSpendCapExceeded } from '@sherpa/llm';
import { createPostgresSpendCap } from './spend-cap.postgres.js';

type Call = { sql: string; params: unknown[] };

/** Tiny in-memory pg.Pool stub. Each test scripts replies for the SELECT SUM hydrate. */
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

describe('spend-cap.postgres / hydrate + check', () => {
  it('hydrates from SELECT SUM(cost_usd) on first check', async () => {
    const { pool, calls } = makePool([{ rows: [{ total: '12.500000' }] }]);
    const cap = createPostgresSpendCap(pool, { capUsd: 50 });
    await cap.check();
    expect(calls.length).toBe(1);
    expect(calls[0]!.sql).toContain('SUM(cost_usd)');
    expect(calls[0]!.sql).toContain('FROM llm_usage');
  });

  it('uses date_trunc on both sides of the WHERE — keeps the comparison server-side (regression: PR #10 bug class)', async () => {
    // The PR #10 audit_log review surfaced a TIMESTAMPTZ µs vs JS-Date ms
    // truncation bug whenever a JS Date crosses the comparison boundary.
    // Here we never round-trip a Date through JS — the WHERE clause must
    // compare server-computed truncations of `created_at` and `NOW()`.
    const { pool, calls } = makePool([{ rows: [{ total: 0 }] }]);
    const cap = createPostgresSpendCap(pool, { capUsd: 50 });
    await cap.spentToday();
    const sql = calls[0]!.sql;
    expect(sql).toMatch(/date_trunc\('day',\s*created_at\)/);
    expect(sql).toMatch(/date_trunc\('day',\s*NOW\(\)\)/);
    expect(calls[0]!.params).toEqual([]); // no JS Date params crossing the boundary
  });

  it('throws LLMSpendCapExceeded when hydrated total >= cap', async () => {
    const { pool } = makePool([{ rows: [{ total: '50.000000' }] }]);
    const cap = createPostgresSpendCap(pool, { capUsd: 50 });
    await expect(cap.check()).rejects.toBeInstanceOf(LLMSpendCapExceeded);
  });

  it('parses NUMERIC string from pg into a finite number (pg returns NUMERIC as string)', async () => {
    // `cost_usd NUMERIC(10,6)` aggregates as NUMERIC, which node-postgres
    // surfaces as a string. If we accidentally fed the raw string into the
    // `>= cap` comparison it would lexicographic-compare and tests like
    // "9.999999 >= 50" would yield true. Guard explicitly.
    const { pool } = makePool([{ rows: [{ total: '9.999999' }] }]);
    const cap = createPostgresSpendCap(pool, { capUsd: 50 });
    expect(await cap.spentToday()).toBeCloseTo(9.999999, 6);
    await expect(cap.check()).resolves.toBeUndefined();
  });

  it('treats SUM=NULL (no rows yet today) as 0', async () => {
    // COALESCE in the query handles NULL→0, but if a future schema change
    // drops the COALESCE we want this test to flag it.
    const { pool } = makePool([{ rows: [] }]);
    const cap = createPostgresSpendCap(pool, { capUsd: 50 });
    expect(await cap.spentToday()).toBe(0);
  });
});

describe('spend-cap.postgres / record + spentToday', () => {
  it('record(cost) bumps the cached total without an extra DB call', async () => {
    const { pool, calls } = makePool([{ rows: [{ total: '1.000000' }] }]);
    const cap = createPostgresSpendCap(pool, { capUsd: 50 });
    await cap.record(2.5);
    await cap.record(3); // both hits should ride the cached hydrate
    expect(await cap.spentToday()).toBeCloseTo(6.5, 6);
    expect(calls.length).toBe(1); // single hydrate, no further queries
  });

  it('record() does NOT INSERT — that is the usage sink\'s job (architectural separation)', async () => {
    const { pool, calls } = makePool([{ rows: [{ total: 0 }] }]);
    const cap = createPostgresSpendCap(pool, { capUsd: 50 });
    await cap.record(0.42);
    // Only the hydrate SELECT — no INSERT INTO llm_usage anywhere.
    expect(calls.length).toBe(1);
    expect(calls[0]!.sql.toUpperCase()).not.toContain('INSERT');
  });

  it('record() ignores non-positive / non-finite cost', async () => {
    const { pool } = makePool([{ rows: [{ total: '5.000000' }] }]);
    const cap = createPostgresSpendCap(pool, { capUsd: 50 });
    await cap.record(0);
    await cap.record(-1);
    await cap.record(NaN);
    expect(await cap.spentToday()).toBeCloseTo(5, 6);
  });
});

describe('spend-cap.postgres / day rollover', () => {
  it('re-hydrates after the UTC day boundary advances', async () => {
    let now = new Date('2026-05-13T23:59:59Z');
    const { pool, calls } = makePool([
      { rows: [{ total: '40.000000' }] }, // day 1 hydrate
      { rows: [{ total: '0.000000' }] }, //  day 2 hydrate
    ]);
    const cap = createPostgresSpendCap(pool, { capUsd: 50, now: () => now });
    expect(await cap.spentToday()).toBeCloseTo(40, 6);
    now = new Date('2026-05-14T00:00:01Z');
    expect(await cap.spentToday()).toBe(0);
    expect(calls.length).toBe(2);
  });
});

describe('spend-cap.postgres / capUsd', () => {
  it('exposes the configured cap (defaults to DEFAULT_DAILY_CAP_USD)', () => {
    const { pool } = makePool([]);
    expect(createPostgresSpendCap(pool, { capUsd: 17.5 }).capUsd()).toBe(17.5);
    expect(createPostgresSpendCap(pool).capUsd()).toBe(50);
  });
});
