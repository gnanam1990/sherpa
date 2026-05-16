'use client';

import { useState, useEffect } from 'react';
import { ChainSelector, type Chain } from './ChainSelector';

type TokenBalance = {
  symbol: string;
  balance: string;
  balanceUsd: string;
  chainId: number;
  chainName: string;
};

type ChainPortfolio = {
  chainId: number;
  chainName: string;
  totalValueUsd: string;
  tokens: TokenBalance[];
};

type AggregatedData = {
  totalValueUsd: string;
  chains: ChainPortfolio[];
};

const CHAIN_COLORS: Record<number, string> = {
  8453: '#0052FF',
  137: '#8247E5',
  10: '#FF0420',
  42161: '#28A0F0',
};

function formatUsd(value: string): string {
  const num = parseFloat(value);
  if (num === 0) return '$0.00';
  if (num < 0.01) return '<$0.01';
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type AggregatedPortfolioProps = {
  address?: string;
};

export function AggregatedPortfolio({ address }: AggregatedPortfolioProps) {
  const [selectedChain, setSelectedChain] = useState<Chain | undefined>();
  const [data, setData] = useState<AggregatedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    setError(null);

    const chainParam = selectedChain && selectedChain.id !== 0 ? `?chainId=${selectedChain.id}` : '';
    fetch(`/api/portfolio/${address}/aggregated${chainParam}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        return res.json();
      })
      .then((d) => setData(d as AggregatedData))
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [address, selectedChain]);

  if (!address) {
    return (
      <div className="rounded-lg border border-sherpa-surface2 bg-sherpa-surface p-6 text-center text-sherpa-fg/60">
        Connect wallet to view portfolio
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-sherpa-fg">Portfolio</h2>
        <ChainSelector
          selectedChainId={selectedChain?.id}
          onSelect={setSelectedChain}
          showAll
          disabled={loading}
        />
      </div>

      {loading && (
        <div className="rounded-lg border border-sherpa-surface2 bg-sherpa-surface p-6 text-center text-sherpa-fg/60">
          Loading portfolio...
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {data && !loading && (
        <>
          <div className="rounded-lg border border-sherpa-surface2 bg-sherpa-surface p-4">
            <div className="text-sm text-sherpa-fg/60">Total Value</div>
            <div className="text-2xl font-bold text-sherpa-fg">{formatUsd(data.totalValueUsd)}</div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {data.chains.map((chain) => (
              <div
                key={chain.chainId}
                className="rounded-lg border border-sherpa-surface2 bg-sherpa-surface p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: CHAIN_COLORS[chain.chainId] ?? '#888' }}
                  />
                  <span className="text-sm font-medium text-sherpa-fg">{chain.chainName}</span>
                  <span className="ml-auto text-sm text-sherpa-fg/60">{formatUsd(chain.totalValueUsd)}</span>
                </div>
                <div className="space-y-1">
                  {chain.tokens.map((token) => (
                    <div key={token.symbol} className="flex justify-between text-xs text-sherpa-fg/80">
                      <span>{token.symbol}</span>
                      <span>{formatUsd(token.balanceUsd)}</span>
                    </div>
                  ))}
                  {chain.tokens.length === 0 && (
                    <div className="text-xs text-sherpa-fg/40">No tokens</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {data.chains.length === 0 && (
            <div className="rounded-lg border border-sherpa-surface2 bg-sherpa-surface p-6 text-center text-sherpa-fg/60">
              No positions found
            </div>
          )}
        </>
      )}
    </div>
  );
}
