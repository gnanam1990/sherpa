/**
 * `*.eth` (and any non-Basename ENS name) → address via Ethereum mainnet.
 *
 * Uses viem's built-in `getEnsAddress`, which reads from the ENS Universal
 * Resolver baked into viem's `mainnet` chain config. RPC is supplied via
 * `ALCHEMY_ETH_MAINNET_RPC` when set; otherwise we fall back to
 * `ethereum.publicnode.com` (rate-limited but reliable).
 */

import { createPublicClient, http, type PublicClient } from 'viem';
import { mainnet } from 'viem/chains';
import { getEnsAddress } from 'viem/actions';
import type { Address, ResolvedAddress, ResolverError } from './types.js';

export type EnsConfig = {
  /** Mainnet RPC URL. Falls through to viem's default chain RPC if absent. */
  rpcUrl?: string;
  /** Pre-built client (tests). */
  client?: PublicClient;
};

export function createEnsBackend(
  config: EnsConfig = {},
): (name: string) => Promise<ResolvedAddress | ResolverError> {
  const client =
    config.client ??
    createPublicClient({
      chain: mainnet,
      transport: http(config.rpcUrl),
    });
  return async function resolveEns(name: string) {
    let addr: Address | null;
    try {
      addr = (await getEnsAddress(client, { name })) as Address | null;
    } catch (err) {
      return {
        type: 'api_error',
        input: name,
        provider: 'ens',
        message: (err as Error).message,
      };
    }
    if (!addr) return { type: 'not_found', input: name };
    return {
      address: addr.toLowerCase() as Address,
      source: 'ens',
      display: name,
      metadata: { ens_name: name },
    };
  };
}
