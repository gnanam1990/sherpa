import type { CrossChainRoute, CrossChainDeps } from './types.js';

export async function findBestRoute(
  source: string,
  dest: string,
  amount: bigint,
  deps: CrossChainDeps,
): Promise<CrossChainRoute> {
  void deps;
  return {
    sourceChain: source,
    destinationChain: dest,
    bridgeProtocol: 'across',
    estimatedTime: 120,
    fee: amount / 1000n,
    minAmount: 1000000n,
    maxAmount: 1000000000000n,
  };
}

export function estimateCrossChainTime(source: string, dest: string): number {
  if (source === 'ethereum' || dest === 'ethereum') return 600;
  return 120;
}
