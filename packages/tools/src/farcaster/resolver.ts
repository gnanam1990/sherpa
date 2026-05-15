import type { NeynarDeps } from './types.js';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export type ResolvedFarcasterUser = {
  fid: number;
  username: string;
  address: `0x${string}`;
};

export async function resolveFarcasterAddress(
  username: string,
  deps: NeynarDeps,
): Promise<ResolvedFarcasterUser | null> {
  if (!deps.neynarApiKey) return null;

  const fetchImpl = deps.fetchImpl ?? fetch;
  const url = `https://api.neynar.com/v2/farcaster/user/by_username?username=${encodeURIComponent(username)}`;

  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: 'GET',
      headers: { 'x-api-key': deps.neynarApiKey, accept: 'application/json' },
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  type NeynarUser = {
    fid?: number;
    username?: string;
    custody_address?: string;
    verified_addresses?: { eth_addresses?: string[] };
  };

  let body: { user?: NeynarUser };
  try {
    body = (await res.json()) as { user?: NeynarUser };
  } catch {
    return null;
  }

  const user = body.user;
  if (!user?.fid) return null;

  const verified = user.verified_addresses?.eth_addresses ?? [];
  const candidate = verified.find((a) => ADDRESS_RE.test(a)) ?? user.custody_address;
  if (!candidate || !ADDRESS_RE.test(candidate)) return null;

  return {
    fid: user.fid,
    username: user.username ?? username,
    address: candidate.toLowerCase() as `0x${string}`,
  };
}
