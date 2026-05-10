import { describe, it, expect } from 'vitest';
import { createIdentityCache, MAX_CACHE_INPUT_LENGTH, TTL_SECONDS } from './cache.js';
import type { ResolvedAddress } from './types.js';

type KvCall = { op: 'get' | 'set'; key: string; value?: unknown; ex?: number };

function makeKv() {
  const store = new Map<string, unknown>();
  const calls: KvCall[] = [];
  return {
    store,
    calls,
    kv: {
      async get<T>(key: string): Promise<T | null> {
        calls.push({ op: 'get', key });
        return (store.get(key) as T | undefined) ?? null;
      },
      async set(key: string, value: unknown, options?: { ex?: number }) {
        calls.push({ op: 'set', key, value, ex: options?.ex });
        store.set(key, value);
        return 'OK';
      },
    },
  };
}

const ENTRY: ResolvedAddress = {
  address: '0x036cbd53842c5426634e7929541ec2318f3dcf7e',
  source: 'farcaster',
  display: '@vitalik',
};

describe('identity/cache', () => {
  it('builds the canonical key format and lowercases the input', () => {
    const c = createIdentityCache();
    expect(c.keyOf('farcaster', 'Vitalik.eth')).toBe('resolve:farcaster:vitalik.eth');
    expect(c.keyOf('basename', 'JESSE.base.eth')).toBe('resolve:basename:jesse.base.eth');
  });

  it('throws on inputs longer than the guard', () => {
    const c = createIdentityCache();
    const long = 'a'.repeat(MAX_CACHE_INPUT_LENGTH + 1);
    expect(() => c.keyOf('ens', long)).toThrow(/exceeds/);
  });

  it('serves the LRU before reaching KV', async () => {
    const { kv, calls } = makeKv();
    const c = createIdentityCache({ kv });
    await c.set('farcaster', '@v', ENTRY);
    const before = calls.length;
    const hit = await c.get('farcaster', '@v');
    expect(hit).toEqual(ENTRY);
    // No additional KV op for the LRU hit.
    expect(calls.length).toBe(before);
  });

  it('promotes KV hits into the LRU', async () => {
    const { kv, calls } = makeKv();
    // Pre-populate KV directly so the LRU starts cold.
    kv.set('resolve:farcaster:@v', ENTRY);
    const c = createIdentityCache({ kv });
    const hit1 = await c.get('farcaster', '@v');
    expect(hit1).toEqual(ENTRY);
    const kvGetsBefore = calls.filter((c) => c.op === 'get').length;
    const hit2 = await c.get('farcaster', '@v');
    expect(hit2).toEqual(ENTRY);
    // Second read should be served by the LRU — no new KV `get`.
    expect(calls.filter((c) => c.op === 'get').length).toBe(kvGetsBefore);
  });

  it('writes through with the TTL for the source', async () => {
    const { kv, calls } = makeKv();
    const c = createIdentityCache({ kv });
    await c.set('basename', 'jesse.base.eth', { ...ENTRY, source: 'basename', display: 'jesse.base.eth' });
    const setCall = calls.find((c) => c.op === 'set');
    expect(setCall?.ex).toBe(TTL_SECONDS.basename);
    expect(setCall?.key).toBe('resolve:basename:jesse.base.eth');
  });

  it('evicts the oldest LRU entry when full', async () => {
    const c = createIdentityCache({ maxLru: 2 });
    await c.set('ens', 'a.eth', { ...ENTRY, source: 'ens', display: 'a.eth' });
    await c.set('ens', 'b.eth', { ...ENTRY, source: 'ens', display: 'b.eth' });
    await c.set('ens', 'c.eth', { ...ENTRY, source: 'ens', display: 'c.eth' });
    // a.eth is the oldest, should have been evicted.
    expect(await c.get('ens', 'a.eth')).toBeNull();
    expect(await c.get('ens', 'b.eth')).not.toBeNull();
    expect(await c.get('ens', 'c.eth')).not.toBeNull();
  });

  it('returns null on miss when KV is absent', async () => {
    const c = createIdentityCache();
    expect(await c.get('ens', 'unknown.eth')).toBeNull();
  });
});
