export type LLMTask = 'parse' | 'disambig' | 'summary' | 'narration';

export type LLMProvider = 'gpt-4o-mini' | 'groq-llama' | 'claude-haiku';

export type LLMRequest = {
  task: LLMTask;
  system: string;
  user: string;
  /** Optional hint; the router may override based on cost/capacity. */
  preferredProvider?: LLMProvider;
};

export type LLMUsage = {
  provider: LLMProvider;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
};

export type LLMResponse = {
  text: string;
  usage: LLMUsage;
};
