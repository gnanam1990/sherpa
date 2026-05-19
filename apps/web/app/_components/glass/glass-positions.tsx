'use client';

import { useState } from 'react';
import { usePositionsData } from '../../../hooks/usePositionsData';
import { healthFactorLabel } from '../HealthFactorBadge';
import { formatUsdBase } from '../PositionsView';
import { AppFrame } from './app-frame';
import { GlassPortfolio } from './glass-portfolio';
import { TopBar } from './top-bar';
import { useGlassTopBar } from './top-bar-data';
import { GlassChip, GlassPanel, MetaLabel } from './primitives';
import type { ChipTone } from './primitives';

/**
 * Glass Aurora Aave positions screen.
 *
 * Same data as the legacy view (consumes {@link usePositionsData}) with
 * the Glass presentation: an Instrument-Serif net-collateral hero, glass
 * stat tiles, and the real health-factor reused from the shared
 * {@link healthFactorLabel}. Honest states for disconnected / loading /
 * error / no-position — nothing is faked.
 */

function hfTone(label: string): ChipTone {
  if (label.includes('Safe') || label.includes('No debt')) return 'success';
  if (label.includes('Caution')) return 'warning';
  return 'danger';
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <GlassPanel className="p-4">
      <MetaLabel>{label}</MetaLabel>
      <div className="mt-1 font-mono text-xl">{value}</div>
    </GlassPanel>
  );
}

function PositionsBody() {
  const { connected, data, loading, error, refresh } = usePositionsData();

  if (!connected) {
    return (
      <GlassPanel className="p-6">
        <p className="text-sm opacity-70">
          Connect your wallet to view Aave positions.
        </p>
      </GlassPanel>
    );
  }

  if (loading && !data) {
    return (
      <GlassPanel className="p-6">
        <p className="text-sm opacity-70">Loading positions…</p>
      </GlassPanel>
    );
  }

  if (error) {
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

  if (!data || !data.hasPosition) {
    return (
      <GlassPanel className="p-6">
        <h3 className="mb-2 text-lg font-semibold">No Aave positions</h3>
        <p className="text-sm opacity-70">
          This wallet has no supplied collateral or borrowed debt on Aave V3
          Base yet.
        </p>
        <p className="mt-2 text-xs opacity-55">
          Lending and borrowing through Sherpa are live on Base mainnet with
          guarded amount caps. Start with a tiny transaction and review every
          wallet prompt before signing.
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="glass-thin mt-4 rounded-full px-3 py-1 text-sm"
        >
          Refresh
        </button>
      </GlassPanel>
    );
  }

  const hf = healthFactorLabel(BigInt(data.healthFactor));

  return (
    <div className="space-y-4">
      <div className="lens-border">
        <div className="glass-deep relative overflow-hidden p-6">
          <div className="flex items-center justify-between">
            <MetaLabel>Total collateral</MetaLabel>
            <GlassChip tone={hfTone(hf.label)}>{hf.label}</GlassChip>
          </div>
          <div
            className="text-gradient-ice mt-2 font-serif italic leading-none"
            style={{ fontSize: 56 }}
          >
            {formatUsdBase(data.totalCollateralBase)}
          </div>
          <div className="mt-2 font-mono text-[11px] opacity-55">
            Base mainnet · read-only from Aave Pool
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Debt" value={formatUsdBase(data.totalDebtBase)} />
        <Stat
          label="Available"
          value={formatUsdBase(data.availableBorrowsBase)}
        />
        <Stat
          label="Health factor"
          value={hf.label.replace('HF ', '')}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Stat
          label="Liquidation threshold"
          value={`${(Number(data.currentLiquidationThreshold) / 100).toFixed(2)}%`}
        />
        <Stat
          label="Loan to value"
          value={`${(Number(data.ltv) / 100).toFixed(2)}%`}
        />
      </div>

      <div className="flex items-center justify-between font-mono text-[11px] opacity-55">
        <span>Updated {new Date(data.fetchedAt).toLocaleTimeString()}</span>
        <button
          type="button"
          disabled={loading}
          onClick={() => void refresh()}
          className="glass-thin rounded-full px-3 py-1 disabled:opacity-50"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
    </div>
  );
}

type PositionsMode = 'base' | 'all';

function ModeToggle({
  mode,
  onModeChange,
}: {
  mode: PositionsMode;
  onModeChange: (mode: PositionsMode) => void;
}) {
  return (
    <div className="glass-thin flex w-full rounded-full p-1 sm:w-auto">
      {[
        { key: 'base' as const, label: 'Base only' },
        { key: 'all' as const, label: 'All chains' },
      ].map((item) => {
        const active = mode === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onModeChange(item.key)}
            className={`flex-1 rounded-full px-3 py-1.5 font-mono text-[11px] transition sm:flex-none ${
              active
                ? 'bg-[#A6F2FF] text-[#06111E] shadow-[0_0_18px_rgba(0,225,255,0.25)]'
                : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
            }`}
            aria-pressed={active}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function GlassPositions() {
  const top = useGlassTopBar();
  const [mode, setMode] = useState<PositionsMode>('base');

  return (
    <AppFrame>
      <TopBar
        account={top.account}
        chain={top.chain}
        live={top.live}
        onDisconnect={top.onDisconnect}
        right={top.right}
      />
      <div className="relative flex-1 overflow-y-auto px-4 py-6 sm:px-7">
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <MetaLabel>Account</MetaLabel>
              <h2 className="mt-1 font-serif text-3xl italic">
                {mode === 'base' ? 'Aave Positions' : 'Portfolio'}
              </h2>
              <p className="mt-1 max-w-2xl text-sm opacity-65">
                {mode === 'base'
                  ? 'Read-only view of your Aave V3 position on Base mainnet.'
                  : 'Read-only token balances across supported chains. Sherpa transactions execute on Base mainnet only.'}
              </p>
            </div>
            <ModeToggle mode={mode} onModeChange={setMode} />
          </div>
          {mode === 'base' ? <PositionsBody /> : <GlassPortfolio />}
        </div>
      </div>
    </AppFrame>
  );
}
