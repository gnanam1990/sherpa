import { describe, expect, test, vi } from 'vitest';
import type { Address, erc20Abi } from 'viem';
import {
  BASE_CHAIN_ID,
  fetchMultiChainPortfolio,
  fetchPortfolio,
  type PortfolioFetcherDeps,
} from './fetcher.js';

type BalanceCall = {
  address: Address;
  abi: typeof erc20Abi;
  functionName: 'balanceOf';
  args: readonly [Address];
};

describe('fetchPortfolio', () => {
  const USER = '0x1111111111111111111111111111111111111111' as const;

  const baseUsdc = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
  const ethUsdc = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
  const polygonUsdc = '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359';

  function emptyAavePosition() {
    return {
      totalCollateralBase: 0n,
      totalDebtBase: 0n,
      availableBorrowsBase: 0n,
      currentLiquidationThreshold: 0n,
      ltv: 0n,
      healthFactor: 0n,
      hasPosition: false,
      fetchedAt: new Date('2026-05-19T00:00:00.000Z'),
    };
  }

  function mockDeps(overrides: Partial<PortfolioFetcherDeps> = {}): PortfolioFetcherDeps {
    return {
      getAaveAccountData: vi.fn(async () => emptyAavePosition()),
      getBalance: vi.fn(async ({ chainId }) => {
        if (chainId === 137) return 25n * 10n ** 18n;
        return 2n * 10n ** 18n;
      }),
      multicall: vi.fn(async ({ chainId, contracts }: {
        chainId: number;
        contracts: readonly BalanceCall[];
      }) => contracts.map((contract) => {
        const tokenAddress = contract.address.toLowerCase();
        if (chainId === BASE_CHAIN_ID && tokenAddress === baseUsdc) {
          return { status: 'success' as const, result: 5_000_000_000n };
        }
        if (chainId === 1 && tokenAddress === ethUsdc) {
          return { status: 'success' as const, result: 1_000_000n };
        }
        if (chainId === 137 && tokenAddress === polygonUsdc) {
          return { status: 'success' as const, result: 12_500_000n };
        }
        return { status: 'success' as const, result: 0n };
      })),
      ...overrides,
    };
  }

  test('defaults to Base mainnet and preserves existing single-chain behavior', async () => {
    const deps = mockDeps();
    const snapshot = await fetchPortfolio(USER, deps);

    expect(snapshot.chainId).toBe(BASE_CHAIN_ID);
    expect(snapshot.chainName).toBe('Base');
    expect(snapshot.chains).toBeUndefined();
    expect(snapshot.errors).toBeUndefined();
    expect(snapshot.tokens.map((token) => token.symbol)).toEqual(['ETH', 'USDC']);
    expect(snapshot.totalValueUsd).toBe(11_000n);
  });

  test('reads ERC-20 balances with one multicall per chain', async () => {
    const deps = mockDeps();
    await fetchPortfolio(USER, deps);

    expect(deps.multicall).toHaveBeenCalledTimes(1);
    expect(deps.multicall).toHaveBeenCalledWith(expect.objectContaining({
      chainId: BASE_CHAIN_ID,
      contracts: expect.arrayContaining([
        expect.objectContaining({ functionName: 'balanceOf' }),
      ]),
    }));
  });

  test('fetches all supported chains and aggregates total value', async () => {
    const deps = mockDeps();
    const snapshot = await fetchPortfolio(USER, { ...deps, chains: [8453, 1, 137, 10, 42161] });

    expect(snapshot.chains).toHaveLength(5);
    expect(snapshot.errors).toEqual([]);
    expect(snapshot.tokens.some((token) => token.chainId === 1 && token.symbol === 'USDC')).toBe(true);
    expect(snapshot.tokens.some((token) => token.chainId === 137 && token.symbol === 'MATIC')).toBe(true);
    expect(snapshot.totalValueUsd).toBe(29_038n);
  });

  test('continues when one chain fails and returns the successful chains', async () => {
    const log = { warn: vi.fn() };
    const deps = mockDeps({
      log,
      getBalance: vi.fn(async ({ chainId }) => {
        if (chainId === 1) throw new Error('ethereum rpc down');
        return 1n * 10n ** 18n;
      }),
    });

    const snapshot = await fetchPortfolio(USER, { ...deps, chains: [8453, 1, 137] });

    expect(snapshot.chains).toHaveLength(2);
    expect(snapshot.errors).toEqual([
      { chainId: 1, chainName: 'Ethereum', message: 'ethereum rpc down' },
    ]);
    expect(log.warn).toHaveBeenCalledWith('portfolio chain fetch failed', {
      chainId: 1,
      chainName: 'Ethereum',
      message: 'ethereum rpc down',
    });
    expect(snapshot.totalValueUsd).toBeGreaterThan(0n);
  });

  test('returns honest empty state for empty wallets across all chains', async () => {
    const deps = mockDeps({
      getBalance: vi.fn(async () => 0n),
      multicall: vi.fn(async ({ contracts }: { contracts: readonly BalanceCall[] }) => (
        contracts.map(() => ({ status: 'success' as const, result: 0n }))
      )),
    });

    const snapshot = await fetchPortfolio(USER, { ...deps, chains: [8453, 1, 137, 10, 42161] });

    expect(snapshot.totalValueUsd).toBe(0n);
    expect(snapshot.tokens).toEqual([]);
    expect(snapshot.chains).toHaveLength(5);
    expect(snapshot.chains?.every((chain) => chain.tokens.length === 0)).toBe(true);
  });

  test('rejects unsupported chains before fetching', async () => {
    await expect(fetchPortfolio(USER, { ...mockDeps(), chains: [8453, 56] }))
      .rejects.toThrow('unsupported_chain:56');
  });
});

describe('fetchMultiChainPortfolio', () => {
  test('returns successful per-chain snapshots for backwards compatibility', async () => {
    const USER = '0x1111111111111111111111111111111111111111' as const;
    const deps: PortfolioFetcherDeps = {
      getAaveAccountData: vi.fn(async () => ({
        totalCollateralBase: 0n,
        totalDebtBase: 0n,
        availableBorrowsBase: 0n,
        currentLiquidationThreshold: 0n,
        ltv: 0n,
        healthFactor: 0n,
        hasPosition: false,
        fetchedAt: new Date('2026-05-19T00:00:00.000Z'),
      })),
      getBalance: vi.fn(async () => 1n * 10n ** 18n),
      multicall: vi.fn(async ({ contracts }: { contracts: readonly BalanceCall[] }) => (
        contracts.map(() => ({ status: 'success' as const, result: 0n }))
      )),
    };

    const snapshots = await fetchMultiChainPortfolio(USER, [8453, 42161], deps);

    expect(snapshots).toHaveLength(2);
    expect(snapshots.map((snapshot) => snapshot.chainId)).toEqual([8453, 42161]);
  });
});
