export type MemoryEntry = {
  id: string;
  userId: `0x${string}`;
  content: string;
  category: 'preference' | 'fact' | 'goal' | 'risk' | 'strategy';
  importance: number;
  embedding?: number[];
  metadata?: Record<string, string>;
};

export type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  intent?: string;
};

export type AgentDeps = {
  llmProvider?: string;
  embeddingModel?: string;
};
