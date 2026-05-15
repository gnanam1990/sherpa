import { describe, test, expect } from 'vitest';
import { MemoryStore } from './memory.js';

describe('MemoryStore', () => {
  test('adds and retrieves memories', async () => {
    const store = new MemoryStore();
    await store.add('0x1234', { content: 'I prefer ETH', category: 'preference', importance: 8, userId: '0x1234' });

    const memories = await store.get('0x1234');
    expect(memories.length).toBe(1);
    expect(memories[0].content).toBe('I prefer ETH');
  });

  test('filters by category', async () => {
    const store = new MemoryStore();
    await store.add('0x1234', { content: 'ETH preference', category: 'preference', importance: 8, userId: '0x1234' });
    await store.add('0x1234', { content: 'Goal: earn yield', category: 'goal', importance: 9, userId: '0x1234' });

    const prefs = await store.get('0x1234', 'preference');
    expect(prefs.length).toBe(1);
  });

  test('search finds matching memories', async () => {
    const store = new MemoryStore();
    await store.add('0x1234', { content: 'I prefer ETH over USDC', category: 'preference', importance: 8, userId: '0x1234' });
    await store.add('0x1234', { content: 'Goal: earn yield on BTC', category: 'goal', importance: 9, userId: '0x1234' });

    const results = await store.search('0x1234', 'ETH');
    expect(results.length).toBe(1);
  });

  test('forget removes matching memories', async () => {
    const store = new MemoryStore();
    await store.add('0x1234', { content: 'Old preference', category: 'preference', importance: 5, userId: '0x1234' });

    const removed = await store.forget('0x1234', 'old');
    expect(removed).toBe(1);

    const memories = await store.get('0x1234');
    expect(memories.length).toBe(0);
  });

  test('getContext returns categories', async () => {
    const store = new MemoryStore();
    await store.add('0x1234', { content: 'Test', category: 'preference', importance: 5, userId: '0x1234' });
    await store.add('0x1234', { content: 'Test2', category: 'goal', importance: 5, userId: '0x1234' });

    const context = await store.getContext('0x1234');
    expect(context.categories.preference).toBe(1);
    expect(context.categories.goal).toBe(1);
  });
});
