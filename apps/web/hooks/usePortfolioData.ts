'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';

export const BASE_PORTFOLIO_CHAIN_ID = 8453;
export const ALL_PORTFOLIO_CHAIN_IDS = [8453, 1, 137, 10, 42161] as const;

export type PortfolioChainId = (typeof ALL_PORTFOLIO_CHAIN_IDS)[number];
export type PortfolioMode = 'base' | 'all';

export type PortfolioTokenBalance = {
  symbol: string;
  address?: string;
  decimals?: number;
  chainId: number;
  balance: string;
  valueUsd: string;
  priceUsd: number;
};

export type PortfolioPositionBalance = {
  protocol: string;
  type: 'lend' | 'borrow' | 'lp' | 'stake';
  tokens: PortfolioTokenBalance[];
  valueUsd: string;
  apy?: number;
};

export type PortfolioChainError = {
  chainId: number;
  chainName: string;
  message: string;
};

export type PortfolioChainBreakdown = {
  chainId: number;
  chainName: string;
  tokens: PortfolioTokenBalance[];
  positions: PortfolioPositionBalance[];
  totalValueUsd: string;
  lastUpdated: string;
  isEmpty: boolean;
  error?: PortfolioChainError;
};

export type PortfolioResponse = {
  address: string;
  requestedChains: number[];
  chains: PortfolioChainBreakdown[];
  errors: PortfolioChainError[];
  totalValueUsd: string;
  totalPnlUsd: string;
  totalPnlPercent: number;
  lastUpdated: string;
};

export type UsePortfolioDataOptions = {
  mode?: PortfolioMode;
  chains?: readonly PortfolioChainId[];
  initialData?: PortfolioResponse;
  addressOverride?: `0x${string}`;
  fetcher?: typeof fetch;
};

export type UsePortfolioDataResult = {
  connected: boolean;
  address?: `0x${string}`;
  mode: PortfolioMode;
  requestedChains: readonly PortfolioChainId[];
  data: PortfolioResponse | null;
  chains: PortfolioChainBreakdown[];
  aggregateTotalValueUsd: string;
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  hasPartialErrors: boolean;
  refresh: () => Promise<void>;
};

type RawPortfolioChain = Omit<PortfolioChainBreakdown, 'isEmpty' | 'error'>;
type RawPortfolioResponse = Omit<PortfolioResponse, 'chains' | 'errors'> & {
  chains: RawPortfolioChain[];
  errors?: PortfolioChainError[];
};

function normalizeChain(chain: RawPortfolioChain, errors: readonly PortfolioChainError[]): PortfolioChainBreakdown {
  return {
    ...chain,
    tokens: chain.tokens ?? [],
    positions: chain.positions ?? [],
    isEmpty: (chain.tokens?.length ?? 0) === 0 && (chain.positions?.length ?? 0) === 0,
    error: errors.find((error) => error.chainId === chain.chainId),
  };
}

async function readPortfolioResponse(res: Response): Promise<PortfolioResponse> {
  const text = await res.text();
  let body: (RawPortfolioResponse & { error?: string; details?: string }) | null = null;
  if (text) {
    try {
      body = JSON.parse(text) as RawPortfolioResponse & { error?: string; details?: string };
    } catch {
      if (!res.ok) throw new Error(`Portfolio API unavailable (${res.status})`);
      throw new Error('Portfolio API returned an invalid response');
    }
  }

  if (!res.ok) {
    throw new Error(body?.details ?? body?.error ?? `Portfolio API unavailable (${res.status})`);
  }
  if (!body) throw new Error('Portfolio API returned an empty response');

  const errors = body.errors ?? [];
  return {
    ...body,
    errors,
    chains: (body.chains ?? []).map((chain) => normalizeChain(chain, errors)),
  };
}

function requestedChainsForMode(mode: PortfolioMode, chains?: readonly PortfolioChainId[]): readonly PortfolioChainId[] {
  if (chains && chains.length > 0) return chains;
  return mode === 'all' ? ALL_PORTFOLIO_CHAIN_IDS : [BASE_PORTFOLIO_CHAIN_ID];
}

function portfolioUrl(address: `0x${string}`, chainIds: readonly PortfolioChainId[]): string {
  if (chainIds.length === 1 && chainIds[0] === BASE_PORTFOLIO_CHAIN_ID) {
    return `/api/portfolio/${address}`;
  }
  return `/api/portfolio/${address}?chains=${chainIds.join(',')}`;
}

/**
 * usePortfolioData — read-only token balance pipeline.
 *
 * Base mainnet is the default and only transaction-capable chain in Sherpa.
 * Passing mode="all" fetches balances on supported chains for display only.
 */
export function usePortfolioData({
  mode = 'base',
  chains,
  initialData,
  addressOverride,
  fetcher,
}: UsePortfolioDataOptions = {}): UsePortfolioDataResult {
  const { address: accountAddress, isConnected } = useAccount();
  const address = addressOverride ?? accountAddress;
  const connected = Boolean(addressOverride || (isConnected && accountAddress));
  const chainsKey = chains?.join(',');
  const requestedChains = useMemo(() => {
    const explicitChains = chainsKey
      ? chainsKey.split(',').map((chainId) => Number(chainId) as PortfolioChainId)
      : undefined;
    return requestedChainsForMode(mode, explicitChains);
  }, [chainsKey, mode]);
  const [data, setData] = useState<PortfolioResponse | null>(initialData ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const res = await (fetcher ?? fetch)(portfolioUrl(address, requestedChains));
      const json = await readPortfolioResponse(res);
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [address, fetcher, requestedChains]);

  useEffect(() => {
    if (!initialData && connected && address) void refresh();
  }, [address, connected, refresh, initialData]);

  const chainsWithRequestedEmptyStates = useMemo(() => {
    const responseChains = data?.chains ?? [];
    return requestedChains.map((chainId) => (
      responseChains.find((chain) => chain.chainId === chainId) ?? {
        chainId,
        chainName: `Chain ${chainId}`,
        tokens: [],
        positions: [],
        totalValueUsd: '0',
        lastUpdated: data?.lastUpdated ?? new Date(0).toISOString(),
        isEmpty: true,
        error: data?.errors.find((chainError) => chainError.chainId === chainId),
      }
    ));
  }, [data, requestedChains]);

  return {
    connected,
    address,
    mode,
    requestedChains,
    data,
    chains: chainsWithRequestedEmptyStates,
    aggregateTotalValueUsd: data?.totalValueUsd ?? '0',
    loading,
    error,
    isEmpty: Boolean(data) && chainsWithRequestedEmptyStates.every((chain) => chain.isEmpty),
    hasPartialErrors: (data?.errors.length ?? 0) > 0,
    refresh,
  };
}
