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
  chainId?: number;
  chainName?: string;
  timestamp: number;
  totalValueUsd: bigint;
  tokens: PortfolioToken[];
  positions: PortfolioPosition[];
  chains?: PortfolioSnapshot[];
  errors?: PortfolioChainError[];
};

export type PortfolioDeps = {
  chainId: number;
  rpcUrl?: string;
};

export type PortfolioChainError = {
  chainId: number;
  chainName: string;
  message: string;
};
