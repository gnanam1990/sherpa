export type CrossChainRoute = {
  sourceChain: string;
  destinationChain: string;
  bridgeProtocol: string;
  estimatedTime: number;
  fee: bigint;
  minAmount: bigint;
  maxAmount: bigint;
};

export type CrossChainStep = {
  chain: string;
  action: string;
  protocol: string;
  estimatedTime: number;
};

export type OrchestratedTx = {
  steps: CrossChainStep[];
  totalTime: number;
  totalFee: bigint;
  status: 'pending' | 'bridging' | 'executing' | 'completed' | 'failed';
};

export type CrossChainDeps = {
  chains: string[];
};
