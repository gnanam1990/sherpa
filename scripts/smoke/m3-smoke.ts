/**
 * M3 stage-gate smoke. Run by a human before promoting to staging /
 * production:
 *
 *   pnpm tsx scripts/smoke/m3-smoke.ts
 *
 * NOT a CI script. Hits real external dependencies — Supabase, Neynar,
 * Base mainnet, the deployed API. Each check is independently enabled
 * by its env var; unset vars print SKIP, set-but-broken vars print
 * FAIL. Process exits 1 if anything FAIL'd, 0 if everything PASS or
 * SKIP'd. Lets a partially-configured laptop still smoke the configured
 * surfaces without spurious failures.
 *
 * Checks:
 *   1. DATABASE_URL              — audit_log + llm_usage round-trip
 *   2. NEYNAR_API_KEY            — resolve @vitalik (Farcaster)
 *   3. (always)                  — resolve jesse.base.eth (Basenames, no key needed)
 *   4. CRON_SECRET + config.smokeApiUrl — POST /api/cron/hourly returns 200
 */

import pg from 'pg';
import { createResolver, isResolved } from '@sherpa/identity';
import { loadConfig } from '@sherpa/config';

type Result = { name: string; status: 'PASS' | 'FAIL' | 'SKIP'; detail: string };

const results: Result[] = [];

function record(name: string, status: Result['status'], detail: string) {
  results.push({ name, status, detail });
}

async function checkDatabase(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) return record('DATABASE_URL', 'SKIP', 'env not set');
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const user = ('0x' +
    Math.floor(Math.random() * 1e16)
      .toString(16)
      .padStart(40, '0')) as `0x${string}`;
  try {
    // audit_log
    const a = await pool.query<{ id: number | string }>(
      `INSERT INTO audit_log (user_address, intent, plan_hash, submitted_at)
       VALUES ($1, $2, $3, NOW()) RETURNING id`,
      [user, 'SMOKE', '0x' + '0'.repeat(64)],
    );
    const auditId = Number(a.rows[0]!.id);
    // llm_usage
    await pool.query(
      `INSERT INTO llm_usage (user_address, task, provider, model, prompt_tokens, completion_tokens, cost_usd, latency_ms)
       VALUES ($1, 'parse', 'gpt-4o-mini', 'gpt-4o-mini', 1, 1, 0.000001, 1)`,
      [user],
    );
    // read both
    const r = await pool.query<{ c: number | string }>(
      `SELECT COUNT(*)::int AS c FROM llm_usage WHERE user_address = $1`,
      [user],
    );
    if (Number(r.rows[0]!.c) < 1) throw new Error('llm_usage row not visible');
    record('DATABASE_URL', 'PASS', `audit_log + llm_usage round-trip ok (audit id=${auditId})`);
  } catch (err) {
    record('DATABASE_URL', 'FAIL', (err as Error).message);
  } finally {
    await pool.query('DELETE FROM audit_log WHERE user_address = $1', [user]).catch(() => {});
    await pool.query('DELETE FROM llm_usage WHERE user_address = $1', [user]).catch(() => {});
    await pool.end();
  }
}

async function checkNeynar(): Promise<void> {
  if (!process.env.NEYNAR_API_KEY) return record('NEYNAR_API_KEY', 'SKIP', 'env not set');
  try {
    const config = loadConfig();
    const resolve = createResolver({ config });
    const out = await resolve('@vitalik');
    if (!isResolved(out)) {
      record('NEYNAR_API_KEY', 'FAIL', `@vitalik resolved to error: ${out}`);
      return;
    }
    record('NEYNAR_API_KEY', 'PASS', `@vitalik → ${out.address}`);
  } catch (err) {
    record('NEYNAR_API_KEY', 'FAIL', (err as Error).message);
  }
}

async function checkBasenames(): Promise<void> {
  try {
    const config = loadConfig();
    const resolve = createResolver({ config });
    const out = await resolve('jesse.base.eth');
    if (!isResolved(out)) {
      record('basenames', 'FAIL', `jesse.base.eth resolved to error: ${out}`);
      return;
    }
    record('basenames', 'PASS', `jesse.base.eth → ${out.address}`);
  } catch (err) {
    record('basenames', 'FAIL', (err as Error).message);
  }
}

async function checkCron(): Promise<void> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return record('CRON_SECRET', 'SKIP', 'env not set');
  try {
    const apiUrl = loadConfig().smokeApiUrl;
    const res = await fetch(`${apiUrl.replace(/\/$/, '')}/api/cron/hourly`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
    });
    if (res.status !== 200) {
      record('CRON_SECRET', 'FAIL', `POST /api/cron/hourly → ${res.status}`);
      return;
    }
    const body = (await res.json()) as { ok?: boolean; tasks?: unknown[] };
    if (!body.ok) {
      record('CRON_SECRET', 'FAIL', `body.ok was falsy`);
      return;
    }
    record('CRON_SECRET', 'PASS', `POST /api/cron/hourly → 200 (${body.tasks?.length ?? 0} tasks)`);
  } catch (err) {
    record('CRON_SECRET', 'FAIL', (err as Error).message);
  }
}

async function main() {
  await checkDatabase();
  await checkNeynar();
  await checkBasenames();
  await checkCron();

  const w = Math.max(...results.map((r) => r.name.length));
  for (const r of results) {
    console.log(`[${r.status}] ${r.name.padEnd(w)}  ${r.detail}`);
  }
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const skipped = results.filter((r) => r.status === 'SKIP').length;
  console.log(`\n${passed} passed, ${skipped} skipped, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
