import type { SpendCap } from './spend-cap.js';
import type { LLMProvider, LLMRequest, LLMResponse, LLMTask } from './types.js';

export type ProviderFn = (req: LLMRequest) => Promise<LLMResponse>;

/**
 * Context the router stamps onto every `onUsage` call. The usage sink uses
 * these to populate `llm_usage.task` and (when present) `llm_usage.user_address`
 * — neither of which is recoverable from `LLMResponse` alone.
 */
export type UsageContext = {
  task: LLMTask;
  userAddress?: `0x${string}`;
};

export type RouterConfig = {
  providers: Partial<Record<LLMProvider, ProviderFn>>;
  /** Task → preferred provider. Falls back if preferred throws. */
  taskPreference?: Record<string, LLMProvider[]>;
  /** Optional usage sink (e.g. write to M3's `llm_usage` table). */
  onUsage?: (resp: LLMResponse, ctx: UsageContext) => void | Promise<void>;
  /**
   * Optional daily spend circuit-breaker. When provided, every `complete()`
   * call calls `spendCap.check()` first (throws `LLMSpendCapExceeded` if
   * exceeded) and `spendCap.record(cost)` on success.
   */
  spendCap?: SpendCap;
};

const DEFAULT_PREF: Record<string, LLMProvider[]> = {
  parse: ['gpt-4o-mini', 'groq-llama', 'claude-haiku'],
  disambig: ['gpt-4o-mini', 'groq-llama'],
  summary: ['claude-haiku', 'gpt-4o-mini'],
  narration: ['claude-haiku', 'gpt-4o-mini'],
};

export function createRouter(config: RouterConfig) {
  const preference = { ...DEFAULT_PREF, ...(config.taskPreference ?? {}) };

  return {
    async complete(req: LLMRequest): Promise<LLMResponse> {
      // Cap check happens BEFORE provider fan-out so a runaway loop can't
      // burn through the budget by retrying across fallbacks. `await` is
      // required for the Postgres impl, harmless for in-memory.
      await config.spendCap?.check();

      const order: LLMProvider[] = req.preferredProvider
        ? [req.preferredProvider, ...(preference[req.task] ?? [])]
        : (preference[req.task] ?? (Object.keys(config.providers) as LLMProvider[]));

      const ctx: UsageContext = { task: req.task, userAddress: req.userAddress };
      let lastErr: unknown;
      for (const provider of order) {
        const fn = config.providers[provider];
        if (!fn) continue;
        try {
          const resp = await fn({ ...req, preferredProvider: provider });
          await config.spendCap?.record(resp.usage.costUsd);
          if (config.onUsage) await config.onUsage(resp, ctx);
          return resp;
        } catch (err) {
          lastErr = err;
        }
      }
      throw new Error(
        `[llm/router] all providers failed for task=${req.task}: ${String(lastErr ?? 'no providers configured')}`,
      );
    },
  };
}
