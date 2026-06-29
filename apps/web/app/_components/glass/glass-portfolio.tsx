'use client';


/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { useState } from 'react';
import {
  usePortfolioData,
  type PortfolioChainBreakdown,
  type PortfolioTokenBalance,
} from '../../../hooks/usePortfolioData';
import { GlassChip, GlassPanel, MetaLabel } from './primitives';
import type { ChipTone } from './primitives';

const CHAIN_META: Record<number, { label: string; short: string; color: string }> = {
  8453: { label: 'Base', short: 'B', color: '#0052FF' },
  1: { label: 'Ethereum', short: 'E', color: '#8B93A7' },
  137: { label: 'Polygon', short: 'P', color: '#8247E5' },
  10: { label: 'Optimism', short: 'O', color: '#FF0420' },
  42161: { label: 'Arbitrum', short: 'A', color: '#28A0F0' },
};

function safeBigInt(value: string | undefined): bigint {
  try {
    return BigInt(value ?? '0');
  } catch {
    return 0n;
  }
}

function formatUsd(value: string): string {
  const dollars = safeBigInt(value);
  if (dollars === 0n) return '$0.00';
  return `$${dollars.toLocaleString('en-US')}.00`;
}

function formatTokenAmount(token: PortfolioTokenBalance): string {
  const raw = safeBigInt(token.balance);
  if (raw === 0n) return '0';

  const decimals = BigInt(token.decimals ?? 18);
  const scale = 10n ** decimals;
  const whole = raw / scale;
  const fraction = raw % scale;
  if (fraction === 0n) return whole.toLocaleString('en-US');

  const precision = whole === 0n ? 6 : 4;
  const fractionText = fraction
    .toString()
    .padStart(Number(decimals), '0')
    .slice(0, precision)
    .replace(/0+$/, '');

  if (!fractionText) return whole.toLocaleString('en-US');
  if (whole === 0n && /^0+$/.test(fractionText)) return '<0.000001';
  return `${whole.toLocaleString('en-US')}.${fractionText}`;
}

function chainMeta(chain: PortfolioChainBreakdown) {
  return CHAIN_META[chain.chainId] ?? {
    label: chain.error?.chainName ?? chain.chainName,
    short: chain.chainName.slice(0, 1).toUpperCase(),
    color: '#A6F2FF',
  };
}

function chainStatus(chain: PortfolioChainBreakdown): { label: string; tone?: ChipTone } {
  if (chain.error) return { label: 'RPC issue', tone: 'warning' };
  if (chain.chainId === 8453) return { label: 'Base tx live', tone: 'success' };
  return { label: 'Read-only', tone: 'info' };
}

function ChainLogo({ chain }: { chain: PortfolioChainBreakdown }) {
  const meta = chainMeta(chain);
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl font-mono text-xs font-semibold text-white shadow-[0_0_18px_rgba(255,255,255,0.14)]"
      style={{ background: meta.color }}
      aria-hidden="true"
    >
      {meta.short}
    </span>
  );
}

function ChainTokens({ chain }: { chain: PortfolioChainBreakdown }) {
  if (chain.error) {
    return (
      <div className="rounded-2xl border border-[#FFD180]/20 bg-[#FFD180]/[0.08] p-3 text-sm text-[#FFD180]">
        {chain.error.message}
      </div>
    );
  }

  if (chain.tokens.length === 0 && chain.positions.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-sm opacity-65">
        No token balances found on {chainMeta(chain).label}.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {chain.tokens.map((token) => (
        <div
          key={`${token.chainId}-${token.address ?? token.symbol}-${token.symbol}`}
          className="glass-thin flex items-center justify-between gap-3 rounded-2xl px-3 py-2"
        >
          <div className="min-w-0">
            <div className="font-medium">{token.symbol}</div>
            <div className="font-mono text-[11px] opacity-55">
              {formatTokenAmount(token)} {token.symbol}
            </div>
          </div>
          <div className="shrink-0 text-right font-mono text-sm">
            {formatUsd(token.valueUsd)}
          </div>
        </div>
      ))}

      {chain.chainId === 8453 && chain.positions.length > 0 && (
        <div className="mt-3 space-y-2">
          <MetaLabel>Base protocol positions</MetaLabel>
          {chain.positions.map((position, index) => (
            <div
              key={`${position.protocol}-${position.type}-${index}`}
              className="glass-thin flex items-center justify-between gap-3 rounded-2xl px-3 py-2"
            >
              <div>
                <div className="font-medium">{position.protocol}</div>
                <div className="font-mono text-[11px] capitalize opacity-55">
                  {position.type}
                </div>
              </div>
              <div className="font-mono text-sm">{formatUsd(position.valueUsd)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChainRow({ chain }: { chain: PortfolioChainBreakdown }) {
  const [open, setOpen] = useState(chain.chainId === 8453 || !chain.isEmpty || Boolean(chain.error));
  const meta = chainMeta(chain);
  const status = chainStatus(chain);

  return (
    <GlassPanel className="overflow-hidden p-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-white/[0.04]"
        aria-expanded={open}
      >
        <ChainLogo chain={chain} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{meta.label}</span>
            <GlassChip tone={status.tone}>{status.label}</GlassChip>
          </div>
          <div className="mt-1 font-mono text-[11px] opacity-55">
            {chain.error
              ? 'Balances unavailable for this chain'
              : chain.isEmpty
                ? 'No tracked token balances'
                : `${chain.tokens.length} tracked token${chain.tokens.length === 1 ? '' : 's'}`}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-sm">{formatUsd(chain.totalValueUsd)}</div>
          <div className="mt-1 font-mono text-[11px] opacity-45">
            {open ? 'Hide' : 'Open'}
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-white/10 px-4 pb-4 pt-3">
          <ChainTokens chain={chain} />
        </div>
      )}
    </GlassPanel>
  );
}

/**
 * GlassPortfolio renders cross-chain token balances as display-only data.
 *
 * Non-Base chains never expose transaction buttons here; they are only
 * balance rows. Stage 2 transaction execution remains Base mainnet only.
 */
export function GlassPortfolio() {
  const {
    connected,
    data,
    chains,
    error,
    refresh,
    aggregateTotalValueUsd,
    hasPartialErrors,
  } = usePortfolioData({ mode: 'all' });

  if (!connected) {
    return (
      <GlassPanel className="p-6">
        <p className="text-sm opacity-70">
          Connect your wallet to view token balances across supported chains.
        </p>
      </GlassPanel>
    );
  }

  if (!data && !error) {
    return (
      <GlassPanel className="p-6">
        <p className="text-sm opacity-70">Loading multi-chain balances…</p>
      </GlassPanel>
    );
  }

  if (error && !data) {
    return (
      <GlassPanel className="p-6">
        <p className="text-sm text-[#FFB3B6]">Error: {error}</p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="glass-thin mt-3 rounded-full px-3 py-1 text-sm"
        >
          Retry
        </button>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-4">
      <div className="lens-border">
        <div className="glass-deep relative overflow-hidden p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <MetaLabel>Total net worth</MetaLabel>
            <GlassChip tone="info">Read-only multi-chain</GlassChip>
          </div>
          <div
            className="text-gradient-ice mt-2 font-serif italic leading-none"
            style={{ fontSize: 56 }}
          >
            {formatUsd(aggregateTotalValueUsd)}
          </div>
          <div className="mt-2 font-mono text-[11px] opacity-55">
            Base, Ethereum, Polygon, Optimism, Arbitrum · balances only
          </div>
        </div>
      </div>

      {(error || hasPartialErrors) && (
        <GlassPanel className="border border-[#FFD180]/20 p-4 text-sm text-[#FFD180]">
          Some chain reads failed. Successful chains are still shown below.
        </GlassPanel>
      )}

      <div className="grid gap-3">
        {chains.map((chain) => (
          <ChainRow key={chain.chainId} chain={chain} />
        ))}
      </div>

      <GlassPanel className="p-4">
        <p className="text-sm opacity-75">
          Read-only on non-Base chains. Sherpa transactions execute on Base mainnet only.
        </p>
        <p className="mt-2 text-xs opacity-55">
          Bridge, non-Base lending, and non-Base protocol actions remain disabled
          until their own safety reviews are complete.
        </p>
      </GlassPanel>
    </div>
  );
}
