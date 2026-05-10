/**
 * Read-side helpers backing /admin/llm-usage/*. Aggregations live here
 * (not in the apps/api route handler) so the SQL is unit-testable with
 * the same mock-pg pattern the write side uses.
 */

import type pg from 'pg';
import { query } from '@sherpa/config';

export type TodayUsageReport = {
  totalUsd: number;
  byTask: Record<string, number>;
  byProvider: Record<string, number>;
};

export type UsageRow = {
  id: number;
  userAddress: string | null;
  task: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  latencyMs: number;
  createdAt: number;
};

function num(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v);
  return 0;
}

export async function fetchTodayUsage(pool: pg.Pool): Promise<TodayUsageReport> {
  // One round trip; aggregate in JS. UNION ALL of two GROUP BYs would be
  // marginally faster but harder to read and harder to mock-assert.
  const res = await query<{
    task: string;
    provider: string;
    cost: string | number | null;
  }>(
    pool,
    `SELECT task, provider, COALESCE(SUM(cost_usd), 0) AS cost
       FROM llm_usage
      WHERE date_trunc('day', created_at) = date_trunc('day', NOW())
      GROUP BY task, provider`,
  );
  let totalUsd = 0;
  const byTask: Record<string, number> = {};
  const byProvider: Record<string, number> = {};
  for (const row of res.rows) {
    const cost = num(row.cost);
    totalUsd += cost;
    byTask[row.task] = (byTask[row.task] ?? 0) + cost;
    byProvider[row.provider] = (byProvider[row.provider] ?? 0) + cost;
  }
  return { totalUsd, byTask, byProvider };
}

export async function fetchUserUsage(
  pool: pg.Pool,
  userAddress: string,
  limit = 100,
): Promise<UsageRow[]> {
  // Hardcoded LIMIT 100 per Priority 3 spec — no pagination yet. The
  // index `idx_llm_usage_user_created` (partial: user_address IS NOT NULL)
  // backs this query.
  const res = await query<{
    id: number | string;
    user_address: string | null;
    task: string;
    provider: string;
    model: string;
    prompt_tokens: number;
    completion_tokens: number;
    cost_usd: string | number;
    latency_ms: number;
    created_at: Date;
  }>(
    pool,
    `SELECT id, user_address, task, provider, model,
            prompt_tokens, completion_tokens, cost_usd, latency_ms, created_at
       FROM llm_usage
      WHERE LOWER(user_address) = LOWER($1)
      ORDER BY created_at DESC
      LIMIT $2`,
    [userAddress, limit],
  );
  return res.rows.map((r) => ({
    id: typeof r.id === 'string' ? Number(r.id) : r.id,
    userAddress: r.user_address,
    task: r.task,
    provider: r.provider,
    model: r.model,
    promptTokens: r.prompt_tokens,
    completionTokens: r.completion_tokens,
    costUsd: num(r.cost_usd),
    latencyMs: r.latency_ms,
    createdAt: r.created_at.getTime(),
  }));
}
