/**
 * @sherpa/identity — address resolvers (M3 ownership).
 *
 * M1's tools MUST go through `resolve()` — never call Farcaster / ENS /
 * Basenames directly. See M3_INFRA_PACK §3.
 *
 * `resolve()` is the pure dispatcher (regex → backend). For production
 * use call `createResolver(config)` instead — it layers in the in-memory
 * LRU + Vercel KV cache and constructs real Farcaster/Basenames/ENS
 * backends from config. Cache hits short-circuit before any network call.
 */

import type { SherpaConfig } from '@sherpa/config';
import { createAddressBackend } from './address.js';
import { createBasenamesBackend } from './basenames.js';
import { createEnsBackend } from './ens.js';
import { createFarcasterBackend } from './farcaster.js';
import {
  createIdentityCache,
  type IdentityCache,
  type IdentityCacheOptions,
  type KvLike,
} from './cache.js';
import { resolve, isResolved, type BackendFn, type ResolverBackends } from './resolve.js';
import type { ResolvedAddress, ResolvedSource, ResolverError } from './types.js';

export * from './types.js';
export * from './resolve.js';
export * from './cache.js';
export { createAddressBackend } from './address.js';
export { createBasenamesBackend } from './basenames.js';
export { createEnsBackend } from './ens.js';
export { createFarcasterBackend } from './farcaster.js';

export type CreateResolverOptions = {
  config: SherpaConfig;
  /** Inject a KV-shaped client. Production wiring fills this from `@vercel/kv`. */
  kv?: KvLike;
  /** Override individual backends (tests). */
  backends?: ResolverBackends;
  /** Override LRU sizing. */
  cache?: Pick<IdentityCacheOptions, 'maxLru'>;
};

export type IdentityResolver = (input: string) => Promise<ResolvedAddress | ResolverError>;

/**
 * Build a cached, real-backed resolver. Apps should construct one per
 * server instance and reuse — the LRU lives on the closure.
 */
export function createResolver(opts: CreateResolverOptions): IdentityResolver {
  const { config, backends: overrides = {} } = opts;
  const cache = createIdentityCache({ maxLru: opts.cache?.maxLru, kv: opts.kv });

  const farcaster: BackendFn | undefined = overrides.resolveFarcaster
    ? overrides.resolveFarcaster
    : config.neynarApiKey
      ? createFarcasterBackend({ apiKey: config.neynarApiKey, baseUrl: config.neynarBaseUrl })
      : undefined;

  const basenames: BackendFn =
    overrides.resolveBasename ??
    createBasenamesBackend({ rpcUrl: undefined /* viem default for `base` */ });

  const ens: BackendFn = overrides.resolveEns ?? createEnsBackend({ rpcUrl: config.ethMainnetRpcUrl });

  const address: BackendFn =
    overrides.resolveAddress ??
    createAddressBackend({
      rpcUrl: config.rpcUrl,
      // `useRealRpc=false` must skip the RPC roundtrip — tests rely on this.
      skipActivityCheck: !config.useRealRpc,
    });

  const cached = (source: ResolvedSource, fn: BackendFn): BackendFn => {
    return async (input) => {
      const hit = await cache.get(source, input);
      if (hit) return hit;
      const out = await fn(input);
      if (isResolved(out)) await cache.set(source, input, out);
      return out;
    };
  };

  const wired: ResolverBackends = {
    resolveFarcaster: farcaster ? cached('farcaster', farcaster) : undefined,
    resolveBasename: cached('basename', basenames),
    resolveEns: cached('ens', ens),
    // Direct addresses skip the cache: TTL would only save us one RPC
    // multicall, and the LRU has no real key churn for the same address.
    resolveAddress: address,
  };

  return (input) => resolve(input, wired);
}

/**
 * Internal: surface the cache instance for tests / health endpoints. Not
 * part of the stable contract.
 */
export function _internalCacheForTesting(opts: IdentityCacheOptions): IdentityCache {
  return createIdentityCache(opts);
}
