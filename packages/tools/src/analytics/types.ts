export type AnalyticsQuery = {
  userAddress: `0x${string}`;
  period: 'day' | 'week' | 'month' | 'all';
  chainId?: number;
};

export type VolumeMetrics = {
  totalVolume: string;
  totalVolumeUsd: string;
  dailyAverage: string;
  peakDay: { date: string; volume: string };
};

export type FeeMetrics = {
  totalFeesPaid: string;
  protocolFees: string;
  gasFees: string;
  averageFeePerTx: string;
};

export type UsageMetrics = {
  totalTransactions: number;
  successRate: number;
  uniqueIntents: number;
  mostUsedIntent: { intent: string; count: number };
  activeDays: number;
};

export type AnalyticsDeps = {
  db?: any;
};
