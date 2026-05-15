import type { AnalyticsQuery, VolumeMetrics, FeeMetrics, UsageMetrics } from './types.js';

export async function getVolumeMetrics(
  query: AnalyticsQuery,
): Promise<VolumeMetrics> {
  return {
    totalVolume: '150000000000',
    totalVolumeUsd: '150000000000',
    dailyAverage: '5000000000',
    peakDay: { date: '2026-05-10', volume: '25000000000' },
  };
}

export async function getFeeMetrics(
  query: AnalyticsQuery,
): Promise<FeeMetrics> {
  return {
    totalFeesPaid: '150000000',
    protocolFees: '150000000',
    gasFees: '0',
    averageFeePerTx: '150000',
  };
}

export async function getUsageMetrics(
  query: AnalyticsQuery,
): Promise<UsageMetrics> {
  return {
    totalTransactions: 1000,
    successRate: 98.5,
    uniqueIntents: 8,
    mostUsedIntent: { intent: 'SWAP', count: 450 },
    activeDays: 45,
  };
}
