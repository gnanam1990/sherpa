/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { createPublicClient, http, type PublicClient } from 'viem';
import { base, baseSepolia } from 'viem/chains';

export type ViemClientConfig = {
  chainId: number;
  rpcUrl: string;
};

/** Returns a memoised viem public client for a given chain+rpc. */
const cache = new Map<string, PublicClient>();

export function getPublicClient(config: ViemClientConfig): PublicClient {
  const key = `${config.chainId}:${config.rpcUrl}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const chain = config.chainId === base.id ? base : baseSepolia;
  const client = createPublicClient({
    chain,
    transport: http(config.rpcUrl),
  }) as unknown as PublicClient;
  cache.set(key, client);
  return client;
}
