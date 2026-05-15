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
