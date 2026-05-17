'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { HealthFactorBadge } from './HealthFactorBadge';

export type PositionsResponse = {
  address: string;
  chain: string;
  pool: string;
  totalCollateralBase: string;
  totalDebtBase: string;
  availableBorrowsBase: string;
  currentLiquidationThreshold: string;
  ltv: string;
  healthFactor: string;
  hasPosition: boolean;
  fetchedAt: string;
};

function decimalStringFromBaseUnits(value: bigint, decimals: number, displayDecimals = 2): string {
  const scale = 10n ** BigInt(decimals);
  const whole = value / scale;
  const remainder = value % scale;
  const displayScale = 10n ** BigInt(displayDecimals);
  const fraction = ((remainder * displayScale) / scale).toString().padStart(displayDecimals, '0');
  return `${whole}.${fraction}`;
}

export function formatUsdBase(value: string): string {
  return `$${decimalStringFromBaseUnits(BigInt(value), 8, 2)}`;
}

function formatBps(value: string): string {
  return `${decimalStringFromBaseUnits(BigInt(value), 2, 2)}%`;
}

type PositionsViewProps = {
  initialData?: PositionsResponse;
  addressOverride?: `0x${string}`;
};

export function PositionsView({ initialData, addressOverride }: PositionsViewProps = {}) {
  const { address: accountAddress, isConnected } = useAccount();
  const address = addressOverride ?? accountAddress;
  const connected = Boolean(addressOverride || (isConnected && accountAddress));
  const [data, setData] = useState<PositionsResponse | null>(initialData ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/positions/${address}`);
      const json = (await res.json()) as PositionsResponse & { error?: string; details?: string };
      if (!res.ok) throw new Error(json.details ?? json.error ?? `API ${res.status}`);
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (!initialData && connected && address) void fetchPositions();
  }, [address, connected, fetchPositions, initialData]);

  if (!connected) {
    return (
      <div className="rounded-lg border border-sherpa-surface2 bg-sherpa-surface p-6">
        <p className="text-sm text-sherpa-muted">Connect your wallet to view Aave positions.</p>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="rounded-lg border border-sherpa-surface2 bg-sherpa-surface p-6">
        <p className="text-sm text-sherpa-muted">Loading positions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-sherpa-danger/40 bg-sherpa-danger/10 p-6">
        <p className="text-sm text-sherpa-danger">Error: {error}</p>
        <button
          className="mt-3 rounded-full border border-sherpa-danger/40 px-3 py-1 text-sm text-sherpa-fg transition hover:border-sherpa-danger"
          onClick={() => void fetchPositions()}
          type="button"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data || !data.hasPosition) {
    return (
      <div className="rounded-lg border border-sherpa-surface2 bg-sherpa-surface p-6">
        <h3 className="mb-2 text-lg font-semibold">No Aave positions</h3>
        <p className="text-sm text-sherpa-muted">
          This wallet has no supplied collateral or borrowed debt on Aave V3 Base yet.
        </p>
        <p className="mt-2 text-xs text-sherpa-muted">
          Lending and borrowing through Sherpa are live on Base mainnet with guarded amount caps.
          Start with a tiny transaction and review every wallet prompt before signing.
        </p>
        <button
          className="mt-4 rounded-full border border-sherpa-surface2 px-3 py-1 text-sm text-sherpa-muted transition hover:border-sherpa-muted hover:text-sherpa-fg"
          onClick={() => void fetchPositions()}
          type="button"
        >
          Refresh
        </button>
      </div>
    );
  }

  const hf = BigInt(data.healthFactor);

  return (
    <div className="rounded-lg border border-sherpa-surface2 bg-sherpa-surface p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Your Aave V3 Position</h3>
          <p className="text-xs text-sherpa-muted">Base mainnet, read-only from Aave Pool</p>
        </div>
        <HealthFactorBadge hf={hf} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-sherpa-surface2 bg-sherpa-bg p-3">
          <div className="text-xs text-sherpa-muted">Collateral</div>
          <div className="mt-1 font-mono text-xl">{formatUsdBase(data.totalCollateralBase)}</div>
        </div>
        <div className="rounded-lg border border-sherpa-surface2 bg-sherpa-bg p-3">
          <div className="text-xs text-sherpa-muted">Debt</div>
          <div className="mt-1 font-mono text-xl">{formatUsdBase(data.totalDebtBase)}</div>
        </div>
        <div className="rounded-lg border border-sherpa-surface2 bg-sherpa-bg p-3">
          <div className="text-xs text-sherpa-muted">Available</div>
          <div className="mt-1 font-mono text-xl">
            {formatUsdBase(data.availableBorrowsBase)}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg border border-sherpa-surface2 bg-sherpa-bg p-3">
          <div className="text-xs text-sherpa-muted">Liquidation threshold</div>
          <div className="mt-1 font-mono">{formatBps(data.currentLiquidationThreshold)}</div>
        </div>
        <div className="rounded-lg border border-sherpa-surface2 bg-sherpa-bg p-3">
          <div className="text-xs text-sherpa-muted">Loan to value</div>
          <div className="mt-1 font-mono">{formatBps(data.ltv)}</div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-sherpa-surface2 pt-4 text-xs text-sherpa-muted">
        <span>Updated {new Date(data.fetchedAt).toLocaleTimeString()}</span>
        <button
          className="rounded-full border border-sherpa-surface2 px-3 py-1 transition hover:border-sherpa-muted hover:text-sherpa-fg"
          disabled={loading}
          onClick={() => void fetchPositions()}
          type="button"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <p className="mt-4 text-xs text-sherpa-muted">
        Lend, borrow, withdraw, and repay through Sherpa are live on Base mainnet
        through verified, Safe-owned contracts.
      </p>
    </div>
  );
}
