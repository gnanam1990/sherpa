import type { BridgeParams, BridgeQuote } from './types.js';
import { SUPPORTED_CHAINS } from './types.js';

const SPOKE_POOLS: Record<number, `0x${string}`> = {
  8453: '0x09aea4b2242abC8bb4BB78D537A67a245A7bEC64',
  1: '0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5',
  10: '0x6f26Bf09B1C792e3228e5467807a900A503c0281',
  42161: '0xe35e9842fceaCA96570B73C02b79C3858eE19eF4',
};

export async function getBridgeQuote(params: BridgeParams): Promise<BridgeQuote> {
  const destChainId = SUPPORTED_CHAINS[params.destinationChain];
  if (!destChainId) {
    throw new Error(`Unsupported destination chain: ${params.destinationChain}`);
  }

  const spokePool = SPOKE_POOLS[destChainId];
  if (!spokePool) {
    throw new Error(`No spoke pool for chain ${params.destinationChain}`);
  }

  // Stub: ~0.03% relayer fee, 2-min estimated time, 99.7% output
  const relayerFee = (params.amount * 3n) / 10000n;
  const minOutAmount = params.amount - relayerFee;

  return {
    relayerFee,
    estimatedTime: 120,
    minOutAmount,
    spokePool,
  };
}
