export type LPQuoteParams = {
  tokenA: string;
  tokenB: string;
  amountA: bigint;
  amountB: bigint;
  stable: boolean;
};

export type LPQuote = {
  lpTokenAmount: bigint;
  priceImpactBps: number;
  pool: { address: `0x${string}`; stable: boolean };
};
