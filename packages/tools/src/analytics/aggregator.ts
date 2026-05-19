/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { AnalyticsQuery, VolumeMetrics, FeeMetrics, UsageMetrics } from './types.js';

export async function getVolumeMetrics(
  _query: AnalyticsQuery,
): Promise<VolumeMetrics> {
  return {
    totalVolume: '150000000000',
    totalVolumeUsd: '150000000000',
    dailyAverage: '5000000000',
    peakDay: { date: '2026-05-10', volume: '25000000000' },
  };
}

export async function getFeeMetrics(
  _query: AnalyticsQuery,
): Promise<FeeMetrics> {
  return {
    totalFeesPaid: '150000000',
    protocolFees: '150000000',
    gasFees: '0',
    averageFeePerTx: '150000',
  };
}

export async function getUsageMetrics(
  _query: AnalyticsQuery,
): Promise<UsageMetrics> {
  return {
    totalTransactions: 1000,
    successRate: 98.5,
    uniqueIntents: 8,
    mostUsedIntent: { intent: 'SWAP', count: 450 },
    activeDays: 45,
  };
}
