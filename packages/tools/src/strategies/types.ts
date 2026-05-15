export type StrategyMetadata = {
  id: string;
  name: string;
  description: string;
  creator: `0x${string}`;
  chainId: number;
  visibility: 'public' | 'private' | 'unlisted';
  version: number;
  followers: number;
  totalVolume: string;
  successRate: number;
  tags: string[];
};

export type StrategyExecution = {
  strategyId: string;
  userId: `0x${string}`;
  parameters: Record<string, string>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results: StrategyStepResult[];
};

export type StrategyStepResult = {
  intent: string;
  status: 'success' | 'failed' | 'skipped';
  txHash?: string;
  error?: string;
};

export type StrategyDeps = {
  apiUrl?: string;
};
