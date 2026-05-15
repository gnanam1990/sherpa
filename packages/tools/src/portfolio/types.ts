export type PortfolioToken = {
  symbol: string;
  address: `0x${string}` | 'native';
  decimals: number;
  chainId: number;
  balance: bigint;
  priceUsd: number;
  valueUsd: bigint;
};

export type PortfolioPosition = {
  protocol: string;
  type: 'lend' | 'borrow' | 'lp' | 'stake';
  tokens: PortfolioToken[];
  valueUsd: bigint;
  apy?: number;
};

export type PortfolioSnapshot = {
  timestamp: number;
  totalValueUsd: bigint;
  tokens: PortfolioToken[];
  positions: PortfolioPosition[];
};

export type PortfolioDeps = {
  chainId: number;
  rpcUrl?: string;
};
