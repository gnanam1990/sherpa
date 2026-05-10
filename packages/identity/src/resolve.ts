/**
 * Pure regex-based dispatcher: route `input` to the right backend.
 *
 * The real backends (Farcaster/Neynar, Basenames, ENS, direct address) are
 * built by `createResolver(config)` in `index.ts`. This file only knows
 * how to route. M1's tools call `resolve()`; in production the resolver
 * factory layers in cache + real backends, so the same dispatcher is
 * driving real network calls.
 */

import type { Address, ResolvedAddress, ResolverError } from './types.js';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const BASENAME_RE = /^[a-z0-9-]+\.base\.eth$/i;
const ENS_RE = /^[a-z0-9-]+\.eth$/i;
const FARCASTER_RE = /^@[a-z0-9_.-]+$/i;

/**
 * Backends each return a `ResolvedAddress | ResolverError`. Returning the
 * full discriminated union (rather than `ResolvedAddress | null`) lets the
 * backend distinguish a 404 from a network error and surface that to the
 * user.
 */
export type BackendFn = (input: string) => Promise<ResolvedAddress | ResolverError>;

export type ResolverBackends = {
  resolveFarcaster?: BackendFn;
  resolveBasename?: BackendFn;
  resolveEns?: BackendFn;
  resolveAddress?: BackendFn;
};

function notConfigured(provider: string, input: string): ResolverError {
  return {
    type: 'api_error',
    input,
    provider,
    message: `${provider} backend not configured`,
  };
}

export async function resolve(
  input: string,
  backends: ResolverBackends = {},
): Promise<ResolvedAddress | ResolverError> {
  const trimmed = input.trim();

  if (ADDRESS_RE.test(trimmed)) {
    if (backends.resolveAddress) return backends.resolveAddress(trimmed);
    return {
      address: trimmed.toLowerCase() as Address,
      source: 'direct',
      display: trimmed,
    };
  }

  if (FARCASTER_RE.test(trimmed)) {
    const handle = trimmed.slice(1);
    if (!backends.resolveFarcaster) return notConfigured('farcaster', input);
    return backends.resolveFarcaster(handle);
  }

  // Basenames must be checked before ENS — `*.base.eth` also matches the
  // ENS regex.
  if (BASENAME_RE.test(trimmed)) {
    if (!backends.resolveBasename) return notConfigured('basename', input);
    return backends.resolveBasename(trimmed);
  }

  if (ENS_RE.test(trimmed)) {
    if (!backends.resolveEns) return notConfigured('ens', input);
    return backends.resolveEns(trimmed);
  }

  return { type: 'invalid_format', input };
}

/** Narrow helper: true when the resolver returned a resolved address. */
export function isResolved(r: ResolvedAddress | ResolverError): r is ResolvedAddress {
  return (r as ResolvedAddress).address !== undefined;
}
