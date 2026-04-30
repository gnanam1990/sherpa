import type { LLMProvider, LLMRequest, LLMResponse } from './types.js';

export type ProviderFn = (req: LLMRequest) => Promise<LLMResponse>;

export type RouterConfig = {
  providers: Partial<Record<LLMProvider, ProviderFn>>;
  /** Task → preferred provider. Falls back if preferred throws. */
  taskPreference?: Record<string, LLMProvider[]>;
  /** Optional usage sink (e.g. write to M3's `llm_usage` table). */
  onUsage?: (resp: LLMResponse) => void | Promise<void>;
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
      const order: LLMProvider[] = req.preferredProvider
        ? [req.preferredProvider, ...(preference[req.task] ?? [])]
        : (preference[req.task] ?? (Object.keys(config.providers) as LLMProvider[]));

      let lastErr: unknown;
      for (const provider of order) {
        const fn = config.providers[provider];
        if (!fn) continue;
        try {
          const resp = await fn({ ...req, preferredProvider: provider });
          if (config.onUsage) await config.onUsage(resp);
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
