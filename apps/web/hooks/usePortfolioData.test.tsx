import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ALL_PORTFOLIO_CHAIN_IDS,
  usePortfolioData,
  type PortfolioResponse,
} from './usePortfolioData';

const ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;

const wagmiState = vi.hoisted(() => ({
  current: {
    address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}` | undefined,
    isConnected: true,
  },
}));

vi.mock('wagmi', () => ({
  useAccount: () => wagmiState.current,
}));

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

function portfolioResponse(overrides: Partial<PortfolioResponse> = {}): PortfolioResponse {
  return {
    address: ADDRESS,
    requestedChains: [8453],
    chains: [
      {
        chainId: 8453,
        chainName: 'Base',
        tokens: [
          {
            symbol: 'ETH',
            address: 'native',
            decimals: 18,
            chainId: 8453,
            balance: '1000000000000000000',
            valueUsd: '3000',
            priceUsd: 3000,
          },
        ],
        positions: [],
        totalValueUsd: '3000',
        lastUpdated: '2026-05-19T12:00:00.000Z',
        isEmpty: false,
      },
    ],
    errors: [],
    totalValueUsd: '3000',
    totalPnlUsd: '0',
    totalPnlPercent: 0,
    lastUpdated: '2026-05-19T12:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  wagmiState.current = { address: ADDRESS, isConnected: true };
  vi.unstubAllGlobals();
});

describe('usePortfolioData', () => {
  it('fetches Base-only portfolio by default', async () => {
    const fetcher = vi.fn(() => jsonResponse(portfolioResponse()));

    const { result } = renderHook(() => usePortfolioData({ fetcher }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetcher).toHaveBeenCalledWith(`/api/portfolio/${ADDRESS}`);
    expect(result.current.connected).toBe(true);
    expect(result.current.mode).toBe('base');
    expect(result.current.requestedChains).toEqual([8453]);
    expect(result.current.aggregateTotalValueUsd).toBe('3000');
    expect(result.current.chains[0]?.chainName).toBe('Base');
    expect(result.current.isEmpty).toBe(false);
  });

  it('fetches all supported chains when mode is all', async () => {
    const response = portfolioResponse({
      requestedChains: [...ALL_PORTFOLIO_CHAIN_IDS],
      totalValueUsd: '6001',
      chains: [
        portfolioResponse().chains[0]!,
        {
          chainId: 1,
          chainName: 'Ethereum',
          tokens: [],
          positions: [],
          totalValueUsd: '0',
          lastUpdated: '2026-05-19T12:00:00.000Z',
          isEmpty: true,
        },
        {
          chainId: 137,
          chainName: 'Polygon',
          tokens: [
            {
              symbol: 'MATIC',
              address: 'native',
              decimals: 18,
              chainId: 137,
              balance: '1000000000000000000',
              valueUsd: '1',
              priceUsd: 1,
            },
          ],
          positions: [],
          totalValueUsd: '1',
          lastUpdated: '2026-05-19T12:00:00.000Z',
          isEmpty: false,
        },
      ],
    });
    const fetcher = vi.fn(() => jsonResponse(response));

    const { result } = renderHook(() => usePortfolioData({ mode: 'all', fetcher }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetcher).toHaveBeenCalledWith(`/api/portfolio/${ADDRESS}?chains=8453,1,137,10,42161`);
    expect(result.current.requestedChains).toEqual([8453, 1, 137, 10, 42161]);
    expect(result.current.chains).toHaveLength(5);
    expect(result.current.chains.find((chain) => chain.chainId === 10)?.isEmpty).toBe(true);
    expect(result.current.aggregateTotalValueUsd).toBe('6001');
  });

  it('does not fetch until a wallet address is available', () => {
    wagmiState.current = { address: undefined, isConnected: false };
    const fetcher = vi.fn(() => jsonResponse(portfolioResponse()));

    const { result } = renderHook(() => usePortfolioData({ fetcher }));

    expect(result.current.connected).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.chains).toHaveLength(1);
    expect(result.current.chains[0]?.isEmpty).toBe(true);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('returns an honest empty state across requested chains', async () => {
    const fetcher = vi.fn(() => jsonResponse(portfolioResponse({
      totalValueUsd: '0',
      chains: [
        {
          chainId: 8453,
          chainName: 'Base',
          tokens: [],
          positions: [],
          totalValueUsd: '0',
          lastUpdated: '2026-05-19T12:00:00.000Z',
          isEmpty: true,
        },
      ],
    })));

    const { result } = renderHook(() => usePortfolioData({ fetcher }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isEmpty).toBe(true);
    expect(result.current.aggregateTotalValueUsd).toBe('0');
    expect(result.current.chains[0]?.tokens).toEqual([]);
  });

  it('surfaces API errors without clearing the current data', async () => {
    const fetcher = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse(portfolioResponse()))
      .mockImplementationOnce(() => jsonResponse({ error: 'portfolio_fetch_failed', details: 'rpc unavailable' }, 500));

    const { result } = renderHook(() => usePortfolioData({ fetcher }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.totalValueUsd).toBe('3000');

    await act(async () => result.current.refresh());

    expect(result.current.error).toBe('rpc unavailable');
    expect(result.current.data?.totalValueUsd).toBe('3000');
  });

  it('marks partial chain errors while keeping successful chains', async () => {
    const fetcher = vi.fn(() => jsonResponse(portfolioResponse({
      requestedChains: [8453, 1],
      totalValueUsd: '3000',
      errors: [{ chainId: 1, chainName: 'Ethereum', message: 'ethereum rpc down' }],
    })));

    const { result } = renderHook(() => usePortfolioData({ chains: [8453, 1], fetcher }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetcher).toHaveBeenCalledWith(`/api/portfolio/${ADDRESS}?chains=8453,1`);
    expect(result.current.hasPartialErrors).toBe(true);
    expect(result.current.chains.find((chain) => chain.chainId === 1)?.error?.message).toBe('ethereum rpc down');
  });
});
