/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 * Layered identity cache: in-memory LRU → Vercel KV → resolver miss.
 *
 * Each backend writes through to both layers on hit. The LRU shields KV
 * from hot-path traffic; KV survives Vercel cold starts. When KV creds are
 * absent (local dev, tests) the second layer is a no-op and the LRU is
 * the only cache.
 *
 * Cache keys are `resolve:${source}:${input.toLowerCase()}`. We refuse
 * inputs longer than 200 chars defensively — the regex dispatcher already
 * filters them out, but if a malformed string ever reaches the cache it
 * shouldn't blow up KV with multi-KB keys.
 */

import type { ResolvedAddress, ResolvedSource } from './types.js';

export const MAX_CACHE_INPUT_LENGTH = 200;

/** TTLs per resolver source. Tuned for free-tier API budgets. */
export const TTL_SECONDS: Readonly<Record<ResolvedSource, number>> = Object.freeze({
  farcaster: 60 * 60 * 24 * 7, // 7 days — usernames rarely re-bind to a new fid
  basename: 60 * 60, // 1 hour — Basenames are mutable but slow-moving
  ens: 60 * 60, // 1 hour
  direct: 0, // no point caching identity
});

/**
 * Minimal contract the layered cache needs from a KV implementation. Mirrors
 * `@vercel/kv`'s subset we use, but lets tests inject anything Map-shaped.
 */
export type KvLike = {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown, options?: { ex?: number }): Promise<unknown>;
};

export type IdentityCacheOptions = {
  /** LRU max size. Defaults to 5000. */
  maxLru?: number;
  /** Vercel KV (or stub) instance. Omit to disable the KV layer. */
  kv?: KvLike;
};

export type IdentityCache = {
  get(source: ResolvedSource, input: string): Promise<ResolvedAddress | null>;
  set(source: ResolvedSource, input: string, value: ResolvedAddress): Promise<void>;
  /** Cache-key derivation, exposed for tests. */
  keyOf(source: ResolvedSource, input: string): string;
};

function keyOf(source: ResolvedSource, input: string): string {
  if (input.length > MAX_CACHE_INPUT_LENGTH) {
    throw new Error(
      `[identity/cache] input length ${input.length} exceeds ${MAX_CACHE_INPUT_LENGTH}`,
    );
  }
  return `resolve:${source}:${input.toLowerCase()}`;
}

/** Tiny LRU; insertion order on a Map gives us O(1) access reorder. */
class Lru<V> {
  private readonly store = new Map<string, V>();
  constructor(private readonly max: number) {}
  get(key: string): V | undefined {
    const v = this.store.get(key);
    if (v === undefined) return undefined;
    this.store.delete(key);
    this.store.set(key, v);
    return v;
  }
  set(key: string, value: V): void {
    if (this.store.has(key)) this.store.delete(key);
    this.store.set(key, value);
    if (this.store.size > this.max) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
  }
}

export function createIdentityCache(opts: IdentityCacheOptions = {}): IdentityCache {
  const lru = new Lru<ResolvedAddress>(opts.maxLru ?? 5000);
  const kv = opts.kv;
  return {
    keyOf,
    async get(source, input) {
      const key = keyOf(source, input);
      const hot = lru.get(key);
      if (hot) return hot;
      if (!kv) return null;
      const cold = await kv.get<ResolvedAddress>(key);
      if (cold) lru.set(key, cold);
      return cold ?? null;
    },
    async set(source, input, value) {
      const key = keyOf(source, input);
      lru.set(key, value);
      const ttl = TTL_SECONDS[source];
      if (kv && ttl > 0) await kv.set(key, value, { ex: ttl });
    },
  };
}
