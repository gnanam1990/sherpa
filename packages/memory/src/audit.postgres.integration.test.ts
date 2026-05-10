/**
 * Integration smoke for the Postgres-backed AuditStore.
 *
 * Skipped by default. Set `DATABASE_URL` to a Postgres instance with the
 * 0001_audit_log.sql migration applied to run it. Useful before stage
 * gates / before a Vercel promote.
 *
 *   DATABASE_URL=postgres://... pnpm --filter @sherpa/memory test
 */

import { describe, it, expect, afterAll } from 'vitest';
import pg from 'pg';
import { createPostgresAuditStore } from './audit.postgres.js';

const url = process.env.DATABASE_URL;
const describeIfDb = url ? describe : describe.skip;

describeIfDb('audit.postgres / integration', () => {
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const user = ('0x' +
    Math.floor(Math.random() * 1e16)
      .toString(16)
      .padStart(40, '0')) as `0x${string}`;

  afterAll(async () => {
    await pool.query('DELETE FROM audit_log WHERE user_address = $1', [user]);
    await pool.end();
  });

  it('roundtrips create + update + list + snapshot', async () => {
    const store = createPostgresAuditStore(pool);
    const id = await store.create({
      userAddress: user,
      intent: 'SEND',
      planHash: '0xabc',
      submittedAt: Date.now(),
      surface: 'api',
      rawInput: 'send 1 USDC to vitalik',
    });
    expect(id).toBeGreaterThan(0);

    await store.update(id, { txHash: '0xfeed', confirmedAt: Date.now(), status: 'success' });

    const rows = await store.list(user);
    expect(rows.length).toBe(1);
    expect(rows[0]!.patch.txHash).toBe('0xfeed');

    const snap = await store.snapshot(user);
    expect(snap.txCount).toBe(1);
  });
});
