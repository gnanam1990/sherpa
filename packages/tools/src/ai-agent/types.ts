/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

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
