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
