/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { ConversationMessage } from './types.js';

export class ConversationStore {
  private conversations: Map<string, ConversationMessage[]> = new Map();

  async addMessage(userId: `0x${string}`, message: ConversationMessage): Promise<void> {
    const messages = this.conversations.get(userId) ?? [];
    messages.push(message);

    if (messages.length > 50) {
      messages.splice(0, messages.length - 50);
    }

    this.conversations.set(userId, messages);
  }

  async getHistory(userId: `0x${string}`, limit = 10): Promise<ConversationMessage[]> {
    const messages = this.conversations.get(userId) ?? [];
    return messages.slice(-limit);
  }

  async clear(userId: `0x${string}`): Promise<void> {
    this.conversations.delete(userId);
  }
}
