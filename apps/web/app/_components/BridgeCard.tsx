'use client';

import { useState, useEffect } from 'react';
import { ChainSelector, type Chain } from './ChainSelector';

type BridgeQuote = {
  protocol: string;
  fee: string;
  estimatedTime: number;
  minOutAmount: string;
};

type BridgeCardProps = {
  userAddress?: `0x${string}`;
  disabled?: boolean;
};

const ASSETS = ['USDC', 'ETH', 'WETH', 'USDT'];

export function BridgeCard({ userAddress, disabled }: BridgeCardProps) {
  const [sourceChain, setSourceChain] = useState<Chain | undefined>();
  const [destChain, setDestChain] = useState<Chain | undefined>();
  const [asset, setAsset] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<BridgeQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canQuote = sourceChain && destChain && amount && parseFloat(amount) > 0 && sourceChain.id !== destChain.id;

  useEffect(() => {
    if (!canQuote) {
      setQuote(null);
      return;
    }

    setQuoteLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      fetch('/api/bridge/quote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          asset,
          amount,
          sourceChain: sourceChain!.shortName,
          destinationChain: destChain!.shortName,
        }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Quote failed: ${res.status}`);
          return res.json();
        })
        .then((d) => setQuote(d as BridgeQuote))
        .catch((err) => setError(String(err)))
        .finally(() => setQuoteLoading(false));
    }, 500);

    return () => clearTimeout(timer);
  }, [sourceChain, destChain, asset, amount, canQuote]);

  const executeBridge = async () => {
    if (!userAddress || !sourceChain || !destChain || !amount) return;
    setExecuting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/bridge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          asset,
          amount,
          sourceChain: sourceChain.shortName,
          destinationChain: destChain.shortName,
          recipient: userAddress,
          sender: userAddress,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Bridge failed: ${res.status}`);
      }
      setSuccess('Bridge transaction submitted');
    } catch (err) {
      setError(String(err));
    } finally {
      setExecuting(false);
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  return (
    <div className="rounded-lg border border-sherpa-surface2 bg-sherpa-surface p-4">
      <h3 className="mb-4 text-base font-semibold text-sherpa-fg">Bridge</h3>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-sherpa-fg/60">From</label>
          <ChainSelector
            selectedChainId={sourceChain?.id}
            onSelect={setSourceChain}
            disabled={disabled || executing}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-sherpa-fg/60">To</label>
          <ChainSelector
            selectedChainId={destChain?.id}
            onSelect={setDestChain}
            disabled={disabled || executing}
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-sherpa-fg/60">Asset</label>
            <select
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
              disabled={disabled || executing}
              className="w-full rounded-lg border border-sherpa-surface2 bg-sherpa-surface px-3 py-2 text-sm text-sherpa-fg disabled:opacity-60"
            >
              {ASSETS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-sherpa-fg/60">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              min="0"
              step="any"
              disabled={disabled || executing}
              className="w-full rounded-lg border border-sherpa-surface2 bg-sherpa-surface px-3 py-2 text-sm text-sherpa-fg outline-none focus:border-sherpa-blue disabled:opacity-60"
            />
          </div>
        </div>

        {quoteLoading && (
          <div className="text-center text-xs text-sherpa-fg/60">Getting quote...</div>
        )}

        {quote && !quoteLoading && (
          <div className="rounded-lg border border-sherpa-surface2 bg-sherpa-surface/50 p-3 text-xs">
            <div className="flex justify-between text-sherpa-fg/80">
              <span>Protocol</span>
              <span className="font-medium text-sherpa-fg">{quote.protocol}</span>
            </div>
            <div className="flex justify-between text-sherpa-fg/80">
              <span>Fee</span>
              <span className="font-medium text-sherpa-fg">{formatUsd(quote.fee)}</span>
            </div>
            <div className="flex justify-between text-sherpa-fg/80">
              <span>Est. Time</span>
              <span className="font-medium text-sherpa-fg">{formatTime(quote.estimatedTime)}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-xs text-green-400">
            {success}
          </div>
        )}

        <button
          type="button"
          onClick={executeBridge}
          disabled={!canQuote || !userAddress || disabled || executing || quoteLoading}
          className="w-full rounded-lg bg-sherpa-blue px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {executing ? 'Bridging...' : 'Bridge'}
        </button>
      </div>
    </div>
  );
}

function formatUsd(value: string): string {
  const num = parseFloat(value);
  if (num === 0) return '$0.00';
  if (num < 0.01) return '<$0.01';
  return `$${num.toFixed(4)}`;
}
