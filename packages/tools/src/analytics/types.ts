/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

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
