import { describe, test, expect } from 'vitest';
import { aggregatePortfolio } from './aggregator.js';

describe('Portfolio aggregator', () => {
  test('aggregates multi-chain portfolio', () => {
    const snapshots = [
      { timestamp: Date.now(), totalValueUsd: 3000000000n, tokens: [{ chainId: 8453 }], positions: [] },
      { timestamp: Date.now(), totalValueUsd: 2000000000n, tokens: [{ chainId: 42161 }], positions: [] },
    ];
    const result = aggregatePortfolio(snapshots as any);
    expect(result.totalValueUsd).toBe(5000000000n);
    expect(result.chainBreakdown.length).toBe(2);
  });

  test('handles empty portfolio', () => {
    const result = aggregatePortfolio([]);
    expect(result.totalValueUsd).toBe(0n);
  });

  test('keeps chain id for empty per-chain snapshots', () => {
    const result = aggregatePortfolio([
      { chainId: 137, timestamp: Date.now(), totalValueUsd: 0n, tokens: [], positions: [] },
    ]);

    expect(result.chainBreakdown).toEqual([
      { chainId: 137, valueUsd: 0n, percent: 0 },
    ]);
  });
});
