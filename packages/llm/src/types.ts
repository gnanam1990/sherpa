export type LLMTask = 'parse' | 'disambig' | 'summary' | 'narration';

export type LLMProvider = 'gpt-4o-mini' | 'groq-llama' | 'claude-haiku';

export type LLMRequest = {
  task: LLMTask;
  system: string;
  user: string;
  /** Optional hint; the router may override based on cost/capacity. */
  preferredProvider?: LLMProvider;
  /**
   * Optional caller-supplied user address. When set, the row written by the
   * usage sink stamps `user_address` so /admin/llm-usage/user/:address can
   * surface per-user spend. Pre-auth callers (e.g. /api/parse) leave this
   * undefined; rows then record `user_address = NULL`.
   */
  userAddress?: `0x${string}`;
};

export type LLMUsage = {
  provider: LLMProvider;
  /** Concrete model id reported by the provider call (e.g. `gpt-4o-mini-2024-07-18`). */
  model: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  /** Wall-clock time spent inside the provider call. */
  latencyMs: number;
};

export type LLMResponse = {
  text: string;
  usage: LLMUsage;
};
