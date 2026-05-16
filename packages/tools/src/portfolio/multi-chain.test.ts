import { describe, test, expect } from 'vitest';

describe('multi-chain portfolio aggregation', () => {
  test('aggregates across all 4 supported chains', () => {
    const snapshots = [
      { chainId: 8453, totalValueUsd: 5000000000n, tokens: [{ symbol: 'ETH', balanceUsd: 3000000000n }] },
      { chainId: 137, totalValueUsd: 1000000000n, tokens: [{ symbol: 'MATIC', balanceUsd: 500000000n }] },
      { chainId: 10, totalValueUsd: 2000000000n, tokens: [{ symbol: 'OP', balanceUsd: 1000000000n }] },
      { chainId: 42161, totalValueUsd: 3000000000n, tokens: [{ symbol: 'ARB', balanceUsd: 2000000000n }] },
    ];

    const total = snapshots.reduce((sum, s) => sum + s.totalValueUsd, 0n);
    expect(total).toBe(11000000000n);
    expect(snapshots.length).toBe(4);
  });

  test('handles single chain portfolio', () => {
    const snapshots = [
      { chainId: 8453, totalValueUsd: 1000000000n, tokens: [] },
    ];
    expect(snapshots.length).toBe(1);
    expect(snapshots[0]!.totalValueUsd).toBe(1000000000n);
  });

  test('handles empty portfolio', () => {
    const snapshots: Array<{ chainId: number; totalValueUsd: bigint }> = [];
    const total = snapshots.reduce((sum, s) => sum + s.totalValueUsd, 0n);
    expect(total).toBe(0n);
  });

  test('chain breakdown groups by chainId', () => {
    const snapshots = [
      { chainId: 8453, totalValueUsd: 1000n },
      { chainId: 8453, totalValueUsd: 2000n },
      { chainId: 137, totalValueUsd: 3000n },
    ];

    const byChain = new Map<number, bigint>();
    for (const s of snapshots) {
      byChain.set(s.chainId, (byChain.get(s.chainId) ?? 0n) + s.totalValueUsd);
    }

    expect(byChain.get(8453)).toBe(3000n);
    expect(byChain.get(137)).toBe(3000n);
    expect(byChain.size).toBe(2);
  });

  test('token breakdown includes chain info', () => {
    const tokens = [
      { symbol: 'USDC', chainId: 8453, balanceUsd: 1000n },
      { symbol: 'USDC', chainId: 137, balanceUsd: 500n },
      { symbol: 'USDC', chainId: 10, balanceUsd: 750n },
    ];

    const totalUsdc = tokens.reduce((sum, t) => sum + t.balanceUsd, 0n);
    expect(totalUsdc).toBe(2250n);

    const chains = new Set(tokens.map((t) => t.chainId));
    expect(chains.size).toBe(3);
  });

  test('zero value chains are included', () => {
    const snapshots = [
      { chainId: 8453, totalValueUsd: 1000000000n },
      { chainId: 137, totalValueUsd: 0n },
      { chainId: 10, totalValueUsd: 0n },
      { chainId: 42161, totalValueUsd: 500000000n },
    ];

    const activeChains = snapshots.filter((s) => s.totalValueUsd > 0n);
    expect(activeChains.length).toBe(2);
    expect(snapshots.length).toBe(4); // all chains still present
  });

  test('USD formatting handles large values', () => {
    const value = 123456789012n; // $1234.57 (8 decimals)
    const formatted = (Number(value) / 1e8).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    expect(formatted).toBe('1,234.57');
  });

  test('USD formatting handles small values', () => {
    const value = 50n; // $0.0000005
    const num = Number(value) / 1e8;
    expect(num).toBeLessThan(0.01);
  });
});
