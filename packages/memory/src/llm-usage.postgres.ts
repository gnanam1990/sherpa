/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 * Postgres-backed LLM usage sink.
 *
 * Wired into the router's `onUsage` hook (see `@sherpa/llm` RouterConfig)
 * to write one row per LLM call into `llm_usage`. The cap counter
 * (`PostgresSpendCap`) sums these rows on hydrate; the admin endpoints
 * aggregate them by task / provider / user.
 *
 * `user_address` is nullable: pre-auth callers (/api/parse) leave
 * `ctx.userAddress` undefined, and the row records NULL. /admin/llm-usage/user/:address
 * filters those out naturally.
 *
 * Errors are NOT propagated. A failing INSERT must not break a working
 * LLM response — but it IS logged to `console.error` so a misconfigured
 * pool surfaces in logs rather than silently dropping spend rows.
 */

import type pg from 'pg';
import { query } from '@sherpa/config';
import type { LLMResponse, UsageContext } from '@sherpa/llm';

export type UsageSink = (resp: LLMResponse, ctx: UsageContext) => Promise<void>;

export function createPostgresUsageSink(pool: pg.Pool): UsageSink {
  return async (resp, ctx) => {
    try {
      await query(
        pool,
        `INSERT INTO llm_usage (
           user_address, task, provider, model,
           prompt_tokens, completion_tokens, cost_usd, latency_ms
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          ctx.userAddress ?? null,
          ctx.task,
          resp.usage.provider,
          resp.usage.model,
          resp.usage.promptTokens,
          resp.usage.completionTokens,
          resp.usage.costUsd,
          resp.usage.latencyMs,
        ],
      );
    } catch (err) {
      console.error('[memory/llm-usage] INSERT failed:', (err as Error).message);
    }
  };
}
