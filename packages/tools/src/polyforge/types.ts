export type PolyForgeMarket = {
  id: string;
  question: string;
  resolutionDate: string;
  yesPrice: number; // basis points
  noPrice: number; // basis points
  liquidity: bigint;
  status: 'open' | 'resolved' | 'closed';
};

export type PolyForgeSearchParams = {
  query: string;
  limit?: number;
};

export type PolyForgeDeps = {
  apiUrl?: string;
  apiKey?: string;
};
