import { describe, it, expect, vi } from 'vitest';
import type pg from 'pg';
import type { LLMResponse, UsageContext } from '@sherpa/llm';
import { createPostgresUsageSink } from './llm-usage.postgres.js';

type Call = { sql: string; params: unknown[] };

function makePool(behavior: (sql: string, params: unknown[]) => Promise<unknown>) {
  const calls: Call[] = [];
  const pool = {
    async query(sql: string, params: unknown[] = []) {
      calls.push({ sql: sql.trim(), params });
      return behavior(sql, params);
    },
  } as unknown as pg.Pool;
  return { pool, calls };
}

const sample: LLMResponse = {
  text: 'ok',
  usage: {
    provider: 'gpt-4o-mini',
    model: 'gpt-4o-mini',
    promptTokens: 120,
    completionTokens: 80,
    costUsd: 0.000123,
    latencyMs: 215,
  },
};

const user = '0x0000000000000000000000000000000000000abc' as const;

describe('llm-usage.postgres', () => {
  it('INSERTs all 8 columns with values from resp.usage + ctx', async () => {
    const { pool, calls } = makePool(async () => ({ rows: [], rowCount: 1 }));
    const sink = createPostgresUsageSink(pool);
    const ctx: UsageContext = { task: 'parse', userAddress: user };
    await sink(sample, ctx);
    expect(calls.length).toBe(1);
    const sql = calls[0]!.sql;
    expect(sql.startsWith('INSERT INTO llm_usage')).toBe(true);
    // Column order asserted via params[]: $1=user_address, $2=task,
    // $3=provider, $4=model, $5=prompt_tokens, $6=completion_tokens,
    // $7=cost_usd, $8=latency_ms.
    expect(calls[0]!.params).toEqual([
      user,
      'parse',
      'gpt-4o-mini',
      'gpt-4o-mini',
      120,
      80,
      0.000123,
      215,
    ]);
  });

  it('writes user_address = NULL when ctx.userAddress is undefined (pre-auth /api/parse)', async () => {
    const { pool, calls } = makePool(async () => ({ rows: [], rowCount: 1 }));
    const sink = createPostgresUsageSink(pool);
    await sink(sample, { task: 'parse' });
    expect(calls[0]!.params[0]).toBeNull();
    expect(calls[0]!.params[1]).toBe('parse');
  });

  it('swallows INSERT errors but logs — never breaks a working LLM response', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { pool } = makePool(async () => {
      throw new Error('connection refused');
    });
    const sink = createPostgresUsageSink(pool);
    // Resolves, does not reject:
    await expect(sink(sample, { task: 'parse' })).resolves.toBeUndefined();
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining('[memory/llm-usage] INSERT failed'),
      expect.stringContaining('connection refused'),
    );
    errSpy.mockRestore();
  });

  it('insert SQL writes columns in the exact order matching the migration (smart-mock catches column-order regressions)', async () => {
    // Drift between the INSERT column list and the values list is the
    // most plausible bug class here. Assert the SQL spells out the
    // 8-column order — failing if anyone re-orders one but not the other.
    const { pool, calls } = makePool(async () => ({ rows: [], rowCount: 1 }));
    const sink = createPostgresUsageSink(pool);
    await sink(sample, { task: 'summary', userAddress: user });
    const sql = calls[0]!.sql.replace(/\s+/g, ' ');
    expect(sql).toContain(
      'user_address, task, provider, model, prompt_tokens, completion_tokens, cost_usd, latency_ms',
    );
    expect(sql).toContain('VALUES ($1, $2, $3, $4, $5, $6, $7, $8)');
  });

  it('forwards each LLM task verbatim into the row', async () => {
    const { pool, calls } = makePool(async () => ({ rows: [], rowCount: 1 }));
    const sink = createPostgresUsageSink(pool);
    for (const task of ['parse', 'disambig', 'summary', 'narration'] as const) {
      await sink(sample, { task });
    }
    expect(calls.map((c) => c.params[1])).toEqual([
      'parse',
      'disambig',
      'summary',
      'narration',
    ]);
  });
});
