export type LimitlessMarket = {
  id: string;
  question: string;
  resolutionDate: string;
  yesPrice: number; // basis points
  noPrice: number; // basis points
  liquidity: bigint;
  volume: bigint;
  status: 'open' | 'resolved' | 'closed';
};

export type LimitlessSearchParams = {
  query: string;
  limit?: number;
};

export type LimitlessOrderParams = {
  marketId: string;
  side: 'YES' | 'NO';
  amount: bigint;
  slippageBps?: number;
};

export type LimitlessDeps = {
  apiUrl?: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
};
