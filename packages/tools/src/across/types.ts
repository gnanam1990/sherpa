export type BridgeParams = {
  asset: string;
  amount: bigint;
  sourceChain: string;
  destinationChain: string;
};

export type BridgeQuote = {
  relayerFee: bigint;
  estimatedTime: number;
  minOutAmount: bigint;
  spokePool: `0x${string}`;
};

export const SUPPORTED_CHAINS: Record<string, number> = {
  base: 8453,
  ethereum: 1,
  optimism: 10,
  arbitrum: 42161,
};

export const CHAIN_IDS: Record<string, number> = {
  base: 8453,
  ethereum: 1,
  optimism: 10,
  arbitrum: 42161,
};

export const SUPPORTED_BRIDGE_PAIRS: Array<[string, string]> = [
  ['base', 'ethereum'],
  ['ethereum', 'base'],
  ['base', 'optimism'],
  ['optimism', 'base'],
  ['base', 'arbitrum'],
  ['arbitrum', 'base'],
  ['ethereum', 'optimism'],
  ['optimism', 'ethereum'],
  ['ethereum', 'arbitrum'],
  ['arbitrum', 'ethereum'],
  ['optimism', 'arbitrum'],
  ['arbitrum', 'optimism'],
];

export function isBridgePairSupported(source: string, dest: string): boolean {
  return SUPPORTED_BRIDGE_PAIRS.some(([s, d]) => s === source && d === dest);
}
