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

function stripTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === 47) end -= 1;
  return value.slice(0, end);
}

export type FidSmartWalletLink = {
  fid: number;
  smartwalletAddress: `0x${string}`;
  linkedAt: Date;
  verified: boolean;
};

type SupabaseLike = {
  from(table: string): {
    upsert(
      data: Record<string, unknown>,
      options?: Record<string, unknown>,
    ): Promise<{ error: unknown }>;
    select(columns: string): {
      eq(column: string, value: unknown): Promise<{ data: unknown[] | null; error: unknown }>;
    };
  };
};

export async function linkFidToSmartWallet(
  fid: number,
  address: `0x${string}`,
  deps: { db?: SupabaseLike },
): Promise<FidSmartWalletLink> {
  if (deps.db) {
    const { error } = await deps.db
      .from('fid_smartwallet_links')
      .upsert(
        { fid, smartwallet_address: address.toLowerCase(), linked_at: new Date().toISOString() },
        { onConflict: 'fid' },
      );
    if (error) throw new Error(`[farcaster] linkFidToSmartWallet upsert failed: ${error}`);
  }
  return { fid, smartwalletAddress: address, linkedAt: new Date(), verified: false };
}

export async function getSmartWalletForFid(
  fid: number,
  deps: { db?: SupabaseLike },
): Promise<`0x${string}` | null> {
  if (!deps.db) return null;
  const { data, error } = await deps.db
    .from('fid_smartwallet_links')
    .select('smartwallet_address')
    .eq('fid', fid);
  if (error) throw new Error(`[farcaster] getSmartWalletForFid query failed: ${error}`);
  const row = data?.[0] as { smartwallet_address?: string } | undefined;
  return row?.smartwallet_address ? (row.smartwallet_address.toLowerCase() as `0x${string}`) : null;
}

export type FarcasterUser = {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl?: string;
  verifiedAddresses: `0x${string}`[];
};

export async function resolveFarcasterUser(
  username: string,
  deps: { neynarApiKey?: string; fetchImpl?: typeof fetch },
): Promise<FarcasterUser | null> {
  if (!deps.neynarApiKey) return null;

  // Stub: in production, call Neynar API
  // GET https://api.neynar.com/v2/farcaster/user/search?q={username}
  return null;
}

export async function resolveFidToAddress(
  _fid: number,
  _deps: { neynarApiKey?: string },
): Promise<`0x${string}` | null> {
  // Stub: get verified ETH address for FID
  return null;
}

export async function sendFarcasterNotification(
  _fid: number,
  _message: string,
  _deps: { neynarApiKey?: string },
): Promise<boolean> {
  // Stub: send notification via Neynar
  return false;
}

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
  const baseUrl = stripTrailingSlashes(config.baseUrl ?? 'https://api.neynar.com');
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
