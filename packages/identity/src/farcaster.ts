/**
 * Farcaster username → address via Neynar.
 *
 * GET ${neynarBaseUrl}/v2/farcaster/user/by_username?username=<handle>
 *   x-api-key: ${neynarApiKey}
 *
 * Returns the first verified ETH address when present, falling back to
 * `custody_address` only if none are verified. Verified addresses are the
 * intent — the user actively signed proof of ownership — and skipping
 * custody when verifieds exist avoids "Sherpa sent USDC to a Farcaster
 * custody address that the user can't recover from."
 */

import type { Address, ResolvedAddress, ResolverError } from './types.js';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export type FarcasterConfig = {
  apiKey: string;
  baseUrl?: string;
  /** Injectable for tests. Defaults to global `fetch`. */
  fetchImpl?: typeof fetch;
};

type NeynarUser = {
  fid?: number;
  username?: string;
  custody_address?: string;
  verified_addresses?: { eth_addresses?: string[] };
};

type NeynarResponse = { user?: NeynarUser };

/** Build a backend conforming to the resolver's `resolveFarcaster` shape. */
export function createFarcasterBackend(
  config: FarcasterConfig,
): (username: string) => Promise<ResolvedAddress | ResolverError> {
  const baseUrl = (config.baseUrl ?? 'https://api.neynar.com').replace(/\/+$/, '');
  const fetchImpl = config.fetchImpl ?? fetch;
  return async function resolveFarcaster(username: string) {
    const url = `${baseUrl}/v2/farcaster/user/by_username?username=${encodeURIComponent(username)}`;
    let res: Response;
    try {
      res = await fetchImpl(url, {
        method: 'GET',
        headers: { 'x-api-key': config.apiKey, accept: 'application/json' },
      });
    } catch (err) {
      return {
        type: 'api_error',
        input: username,
        provider: 'neynar',
        message: (err as Error).message,
      };
    }
    if (res.status === 404) return { type: 'not_found', input: username };
    if (!res.ok) {
      return {
        type: 'api_error',
        input: username,
        provider: 'neynar',
        message: `neynar HTTP ${res.status}`,
      };
    }
    let body: NeynarResponse;
    try {
      body = (await res.json()) as NeynarResponse;
    } catch (err) {
      return {
        type: 'api_error',
        input: username,
        provider: 'neynar',
        message: `invalid JSON: ${(err as Error).message}`,
      };
    }
    const user = body.user;
    if (!user) return { type: 'not_found', input: username };

    const verified = user.verified_addresses?.eth_addresses ?? [];
    const candidate = verified.find((a) => ADDRESS_RE.test(a)) ?? user.custody_address;
    if (!candidate || !ADDRESS_RE.test(candidate)) {
      return { type: 'not_found', input: username };
    }
    return {
      address: candidate.toLowerCase() as Address,
      source: 'farcaster',
      display: `@${user.username ?? username}`,
      metadata: {
        farcaster_fid: user.fid,
        farcaster_username: user.username ?? username,
      },
    };
  };
}
