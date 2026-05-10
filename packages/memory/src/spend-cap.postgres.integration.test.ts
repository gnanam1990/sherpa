/**
 * Integration smoke for PostgresSpendCap + PostgresUsageSink.
 *
 * Skipped unless DATABASE_URL is set. Run before stage gates / Vercel
 * promotes:
 *
 *   DATABASE_URL=postgres://... pnpm --filter @sherpa/memory test
 *
 * Inserts a synthetic row with a recognisable user_address, asserts the
 * cap counter sees it, then DELETEs in afterAll.
 */

import { describe, it, expect, afterAll } from 'vitest';
import pg from 'pg';
import { createPostgresSpendCap } from './spend-cap.postgres.js';
import { createPostgresUsageSink } from './llm-usage.postgres.js';

const url = process.env.DATABASE_URL;
const describeIfDb = url ? describe : describe.skip;

describeIfDb('spend-cap.postgres / integration', () => {
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const user = ('0x' +
    Math.floor(Math.random() * 1e16)
      .toString(16)
      .padStart(40, '0')) as `0x${string}`;

  afterAll(async () => {
    await pool.query('DELETE FROM llm_usage WHERE user_address = $1', [user]);
    await pool.end();
  });

  it('round-trips: sink writes a row → cap hydrate sums it → record() bumps cached total', async () => {
    const sink = createPostgresUsageSink(pool);
    await sink({
      text: 'ok',
      usage: {
        provider: 'gpt-4o-mini',
        model: 'gpt-4o-mini',
        promptTokens: 100,
        completionTokens: 50,
        costUsd: 0.001234,
        latencyMs: 42,
      },
    }, { task: 'parse', userAddress: user });

    const cap = createPostgresSpendCap(pool, { capUsd: 50 });
    const before = await cap.spentToday();
    expect(before).toBeGreaterThanOrEqual(0.001234);

    await cap.record(0.5);
    const after = await cap.spentToday();
    expect(after).toBeCloseTo(before + 0.5, 6);
  });
});
