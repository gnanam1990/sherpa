/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { MemoryEntry } from './types.js';

export class MemoryStore {
  private memories: Map<string, MemoryEntry[]> = new Map();

  async add(userId: `0x${string}`, entry: Omit<MemoryEntry, 'id'>): Promise<MemoryEntry> {
    const id = crypto.randomUUID();
    const memory: MemoryEntry = { id, ...entry };

    const userMemories = this.memories.get(userId) ?? [];
    userMemories.push(memory);
    this.memories.set(userId, userMemories);

    return memory;
  }

  async get(userId: `0x${string}`, category?: string): Promise<MemoryEntry[]> {
    const memories = this.memories.get(userId) ?? [];
    if (category) {
      return memories.filter(m => m.category === category);
    }
    return memories;
  }

  async search(userId: `0x${string}`, query: string, limit = 5): Promise<MemoryEntry[]> {
    const memories = this.memories.get(userId) ?? [];
    return memories
      .filter(m => m.content.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, limit);
  }

  async forget(userId: `0x${string}`, query: string): Promise<number> {
    const memories = this.memories.get(userId) ?? [];
    const filtered = memories.filter(m => !m.content.toLowerCase().includes(query.toLowerCase()));
    const removed = memories.length - filtered.length;
    this.memories.set(userId, filtered);
    return removed;
  }

  async getContext(userId: `0x${string}`): Promise<{
    memories: MemoryEntry[];
    categories: Record<string, number>;
  }> {
    const memories = this.memories.get(userId) ?? [];
    const categories: Record<string, number> = {};
    for (const m of memories) {
      categories[m.category] = (categories[m.category] ?? 0) + 1;
    }
    return { memories, categories };
  }
}
