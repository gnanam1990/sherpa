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
 * `*.base.eth` → address via direct read of the Basenames L2Resolver on
 * Base mainnet (chainId 8453).
 *
 * Why not `viem.getEnsAddress`? Base mainnet does not deploy an ENS
 * Universal Resolver (verified against viem v2's `base` chain config —
 * `contracts.ensUniversalResolver` is undefined). Without a UR, viem's
 * convenience helpers don't apply; we read the L2Resolver's `addr(node)`
 * directly. This is what github.com/base-org/basenames examples do.
 *
 * Cross-chain pattern: Sherpa runs on Base Sepolia by default, but
 * Basenames live on Base mainnet. We construct a dedicated mainnet client
 * for the resolver call and let the rest of Sherpa stay on Sepolia.
 */

import { createPublicClient, http, namehash, type PublicClient } from 'viem';
import { base } from 'viem/chains';
import { ONCHAIN_ADDRESSES } from '@sherpa/config';
import type { Address, ResolvedAddress, ResolverError } from './types.js';

const L2_RESOLVER_ABI = [
  {
    type: 'function',
    name: 'addr',
    stateMutability: 'view',
    inputs: [{ type: 'bytes32', name: 'node' }],
    outputs: [{ type: 'address', name: '' }],
  },
] as const;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export type BasenamesConfig = {
  /** Optional Base mainnet RPC URL. Defaults to viem's `base` chain default. */
  rpcUrl?: string;
  /** Override resolver address (tests). */
  resolverAddress?: Address;
  /** Pre-built client (tests). */
  client?: PublicClient;
};

export function createBasenamesBackend(
  config: BasenamesConfig = {},
): (name: string) => Promise<ResolvedAddress | ResolverError> {
  const resolver = (config.resolverAddress ??
    ONCHAIN_ADDRESSES.basenamesL2Resolver) as Address;
  const client =
    config.client ??
    createPublicClient({
      chain: base,
      transport: http(config.rpcUrl),
    });
  return async function resolveBasename(name: string) {
    let result: Address;
    try {
      result = (await client.readContract({
        address: resolver,
        abi: L2_RESOLVER_ABI,
        functionName: 'addr',
        args: [namehash(name)],
      })) as Address;
    } catch (err) {
      return {
        type: 'api_error',
        input: name,
        provider: 'basename',
        message: (err as Error).message,
      };
    }
    if (!result || result.toLowerCase() === ZERO_ADDRESS) {
      return { type: 'not_found', input: name };
    }
    return {
      address: result.toLowerCase() as Address,
      source: 'basename',
      display: name,
      metadata: { basename: name },
    };
  };
}
