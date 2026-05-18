import { describe, test, expect, vi } from 'vitest';
import { fetchPortfolio, fetchMultiChainPortfolio } from './fetcher.js';

describe('fetchPortfolio', () => {
  const USER = '0x1111111111111111111111111111111111111111' as `0x${string}`;

  function mockDeps(overrides: Record<string, unknown> = {}) {
    return {
      getBalance: vi.fn(async () => 2000000000000000000n), // 2 ETH
      readContract: vi.fn(async (params: any) => {
        // Return balances for known tokens
        const addr = params.address?.toLowerCase();
        if (addr === '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913') return 5000000000n; // 5000 USDC
        if (addr === '0x4200000000000000000000000000000000000006') return 1000000000000000000n; // 1 WETH
        if (addr === '0x940181a94a35a4569e4529a3cdfb74e38fd98631') return 0n; // 0 AERO
        return 0n;
      }),
      ...overrides,
    };
  }

  test('fetches real balances for known tokens', async () => {
    const deps = mockDeps();
    const snapshot = await fetchPortfolio(USER, deps);

    expect(snapshot.tokens.length).toBeGreaterThan(0);
    expect(snapshot.totalValueUsd).toBeGreaterThan(0n);
    expect(snapshot.timestamp).toBeGreaterThan(0);
  });

  test('includes native ETH balance', async () => {
    const deps = mockDeps();
    const snapshot = await fetchPortfolio(USER, deps);

    const ethToken = snapshot.tokens.find((t) => t.symbol === 'ETH');
    expect(ethToken).toBeDefined();
    expect(ethToken!.balance).toBe(2000000000000000000n);
    // 2 ETH * $3000 / 10^18 = $6000
    expect(ethToken!.valueUsd).toBe(6000n);
  });

  test('includes ERC-20 balances', async () => {
    const deps = mockDeps();
    const snapshot = await fetchPortfolio(USER, deps);

    const usdcToken = snapshot.tokens.find((t) => t.symbol === 'USDC');
    expect(usdcToken).toBeDefined();
    expect(usdcToken!.balance).toBe(5000000000n);
    // 5000 USDC * $1 / 10^6 = $5000
    expect(usdcToken!.valueUsd).toBe(5000n);
  });

  test('skips zero balances', async () => {
    const deps = mockDeps();
    const snapshot = await fetchPortfolio(USER, deps);

    const aeroToken = snapshot.tokens.find((t) => t.symbol === 'AERO');
    expect(aeroToken).toBeUndefined();
  });

  test('handles empty wallet', async () => {
    const deps = mockDeps({
      getBalance: vi.fn(async () => 0n),
      readContract: vi.fn(async () => 0n),
    });
    const snapshot = await fetchPortfolio(USER, deps);

    expect(snapshot.tokens.length).toBe(0);
    expect(snapshot.totalValueUsd).toBe(0n);
  });

  test('continues when Aave fetch fails', async () => {
    const deps = mockDeps();
    // The Aave call will fail because readContract doesn't handle the Aave pool address
    // But the function should still return a valid snapshot
    const snapshot = await fetchPortfolio(USER, deps);

    expect(snapshot).toBeDefined();
    expect(snapshot.tokens.length).toBeGreaterThan(0);
  });
});

describe('fetchMultiChainPortfolio', () => {
  test('fetches portfolio for multiple chains', async () => {
    const USER = '0x1111111111111111111111111111111111111111' as `0x${string}`;
    const deps = {
      getBalance: vi.fn(async () => 1000000000000000000n),
      readContract: vi.fn(async () => 1000000000n),
    };
    const snapshots = await fetchMultiChainPortfolio(USER, [8453, 42161], deps);

    expect(snapshots.length).toBe(2);
    expect(snapshots[0].tokens.length).toBeGreaterThan(0);
    expect(snapshots[1].tokens.length).toBeGreaterThan(0);
  });
});
