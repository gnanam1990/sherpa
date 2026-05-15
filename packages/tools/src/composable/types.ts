export type FlashLoanParams = {
  asset: string;
  amount: bigint;
  chainId: number;
};

export type LeverageParams = {
  asset: string;
  leverageRatio: number;
  collateralAsset: string;
  chainId: number;
};

export type ComposedStrategy = {
  id: string;
  name: string;
  steps: StrategyStep[];
  totalGas: bigint;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
};

export type StrategyStep = {
  intent: string;
  protocol: string;
  params: Record<string, string>;
  estimatedGas: bigint;
};

export type ComposableDeps = {
  chainId: number;
  aavePool?: `0x${string}`;
};
