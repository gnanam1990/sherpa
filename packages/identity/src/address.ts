/**
 * Direct 0x address resolver + activity check.
 *
 * Address activity is read from Base Sepolia (the runtime chain) in a
 * single multicall: `eth_getTransactionCount` + `eth_getCode`. The result
 * populates `metadata.has_activity` (nonce > 0) and `metadata.is_contract`
 * (code != 0x). Callers decide whether to warn the user.
 *
 * Multicall here means the viem multicall() helper. On Base Sepolia the
 * Multicall3 contract is at the canonical 0xcA11… address, baked into
 * viem's chain config. One RPC roundtrip, two reads.
 */

import { createPublicClient, http, type PublicClient } from 'viem';
import { baseSepolia } from 'viem/chains';
import type { Address, ResolvedAddress, ResolverError } from './types.js';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export type AddressBackendConfig = {
  rpcUrl?: string;
  client?: PublicClient;
  /** Skip the activity check (offline tests, fast paths). */
  skipActivityCheck?: boolean;
};

/**
 * Resolves a checksummed or lowercase 0x address. Returns
 * `invalid_format` for anything that doesn't match the strict 20-byte
 * hex regex.
 *
 * The activity check is best-effort: if the RPC call fails we return the
 * resolved address with `has_activity` undefined rather than an error,
 * because dropping the address entirely on a transient RPC blip would be
 * a worse UX than showing the user an unwarned address.
 */
export function createAddressBackend(
  config: AddressBackendConfig = {},
): (input: string) => Promise<ResolvedAddress | ResolverError> {
  const client =
    config.client ??
    createPublicClient({
      chain: baseSepolia,
      transport: http(config.rpcUrl),
    });
  return async function resolveAddress(input: string) {
    const trimmed = input.trim();
    if (!ADDRESS_RE.test(trimmed)) {
      return { type: 'invalid_format', input };
    }
    const address = trimmed.toLowerCase() as Address;
    const base: ResolvedAddress = {
      address,
      source: 'direct',
      display: trimmed,
    };
    if (config.skipActivityCheck) return base;

    try {
      const [nonce, code] = await Promise.all([
        client.getTransactionCount({ address }),
        client.getCode({ address }),
      ]);
      const isContract = typeof code === 'string' && code !== '0x' && code.length > 2;
      return {
        ...base,
        metadata: {
          has_activity: nonce > 0,
          is_contract: isContract,
        },
      };
    } catch {
      // Best-effort: surface the address without activity metadata.
      return base;
    }
  };
}
