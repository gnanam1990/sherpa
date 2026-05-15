import { describe, test, expect } from 'vitest';
import { getVolumeMetrics, getFeeMetrics, getUsageMetrics } from './aggregator.js';

describe('Analytics aggregator', () => {
  test('getVolumeMetrics returns volume data', async () => {
    const metrics = await getVolumeMetrics({ userAddress: '0x1234', period: 'all' });
    expect(metrics.totalVolume).toBeDefined();
    expect(metrics.dailyAverage).toBeDefined();
  });

  test('getFeeMetrics returns fee data', async () => {
    const metrics = await getFeeMetrics({ userAddress: '0x1234', period: 'all' });
    expect(metrics.totalFeesPaid).toBeDefined();
    expect(metrics.protocolFees).toBeDefined();
  });

  test('getUsageMetrics returns usage data', async () => {
    const metrics = await getUsageMetrics({ userAddress: '0x1234', period: 'all' });
    expect(metrics.totalTransactions).toBeGreaterThan(0);
    expect(metrics.successRate).toBeGreaterThan(0);
  });
});
