import type { Address, ResolvedAddress, ResolverError } from './types.js';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const BASENAME_RE = /^[a-z0-9-]+\.base\.eth$/i;
const ENS_RE = /^[a-z0-9-]+\.eth$/i;
const FARCASTER_RE = /^@[a-z0-9_.-]+$/i;

/** Pluggable backends — Week 4+ replaces these stubs with real HTTP clients. */
export type ResolverBackends = {
  resolveFarcaster?: (username: string) => Promise<ResolvedAddress | null>;
  resolveBasename?: (name: string) => Promise<ResolvedAddress | null>;
  resolveEns?: (name: string) => Promise<ResolvedAddress | null>;
};

/**
 * Route `input` to the right resolver based on its shape.
 *
 * Week-1 behaviour (no backends wired): direct 0x addresses resolve; everything
 * else returns `ResolverError` with a descriptive `type`.
 */
export async function resolve(
  input: string,
  backends: ResolverBackends = {},
): Promise<ResolvedAddress | ResolverError> {
  const trimmed = input.trim();

  if (ADDRESS_RE.test(trimmed)) {
    return {
      address: trimmed as Address,
      source: 'direct',
      display: trimmed,
    };
  }

  if (FARCASTER_RE.test(trimmed)) {
    const handle = trimmed.slice(1);
    if (backends.resolveFarcaster) {
      const out = await backends.resolveFarcaster(handle);
      if (out) return out;
      return { type: 'not_found', input };
    }
    return {
      type: 'api_error',
      input,
      provider: 'farcaster',
      message: 'farcaster backend not configured',
    };
  }

  if (BASENAME_RE.test(trimmed)) {
    if (backends.resolveBasename) {
      const out = await backends.resolveBasename(trimmed);
      if (out) return out;
      return { type: 'not_found', input };
    }
    return {
      type: 'api_error',
      input,
      provider: 'basename',
      message: 'basename backend not configured',
    };
  }

  if (ENS_RE.test(trimmed)) {
    if (backends.resolveEns) {
      const out = await backends.resolveEns(trimmed);
      if (out) return out;
      return { type: 'not_found', input };
    }
    return {
      type: 'api_error',
      input,
      provider: 'ens',
      message: 'ens backend not configured',
    };
  }

  return { type: 'invalid_format', input };
}

/** Narrow helper: true when the resolver returned a resolved address. */
export function isResolved(r: ResolvedAddress | ResolverError): r is ResolvedAddress {
  return (r as ResolvedAddress).address !== undefined;
}
