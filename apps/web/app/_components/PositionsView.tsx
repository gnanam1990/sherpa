'use client';

import {
  usePositionsData,
  type PositionsResponse,
  type UsePositionsDataOptions,
} from '../../hooks/usePositionsData';
import { HealthFactorBadge } from './HealthFactorBadge';

/**
 * Legacy Aave positions view.
 *
 * As of the Glass Aurora migration this is a thin renderer over
 * {@link usePositionsData}; the data behaviour is unchanged
 * (PositionsView.test.tsx is the contract) and the Glass positions
 * screen consumes the same hook.
 */

export type { PositionsResponse };

function decimalStringFromBaseUnits(
  value: bigint,
  decimals: number,
  displayDecimals = 2,
): string {
  const scale = 10n ** BigInt(decimals);
  const whole = value / scale;
  const remainder = value % scale;
  const displayScale = 10n ** BigInt(displayDecimals);
  const fraction = ((remainder * displayScale) / scale)
    .toString()
    .padStart(displayDecimals, '0');
  return `${whole}.${fraction}`;
}

export function formatUsdBase(value: string): string {
  return `$${decimalStringFromBaseUnits(BigInt(value), 8, 2)}`;
}

function formatBps(value: string): string {
  return `${decimalStringFromBaseUnits(BigInt(value), 2, 2)}%`;
}

export function PositionsView({
  initialData,
  addressOverride,
}: UsePositionsDataOptions = {}) {
  const { connected, data, loading, error, refresh } = usePositionsData({
    initialData,
    addressOverride,
  });

  if (!connected) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">Connect your wallet to view Aave positions.</p>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">Loading positions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-base-red/40 bg-base-red/10 p-6">
        <p className="text-sm text-base-red">Error: {error}</p>
        <button
          className="mt-3 rounded-full border border-base-red/40 px-3 py-1 text-sm text-foreground transition hover:border-base-red"
          onClick={() => void refresh()}
          type="button"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data || !data.hasPosition) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-2 text-lg font-semibold">No Aave positions</h3>
        <p className="text-sm text-muted-foreground">
          This wallet has no supplied collateral or borrowed debt on Aave V3 Base yet.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Lending and borrowing through Sherpa are live on Base mainnet with guarded amount caps.
          Start with a tiny transaction and review every wallet prompt before signing.
        </p>
        <button
          className="mt-4 rounded-full border border-border px-3 py-1 text-sm text-muted-foreground transition hover:border-muted-foreground hover:text-foreground"
          onClick={() => void refresh()}
          type="button"
        >
          Refresh
        </button>
      </div>
    );
  }

  const hf = BigInt(data.healthFactor);

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Your Aave V3 Position</h3>
          <p className="text-xs text-muted-foreground">Base mainnet, read-only from Aave Pool</p>
        </div>
        <HealthFactorBadge hf={hf} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="text-xs text-muted-foreground">Collateral</div>
          <div className="mt-1 font-mono text-xl">{formatUsdBase(data.totalCollateralBase)}</div>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="text-xs text-muted-foreground">Debt</div>
          <div className="mt-1 font-mono text-xl">{formatUsdBase(data.totalDebtBase)}</div>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="text-xs text-muted-foreground">Available</div>
          <div className="mt-1 font-mono text-xl">
            {formatUsdBase(data.availableBorrowsBase)}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="text-xs text-muted-foreground">Liquidation threshold</div>
          <div className="mt-1 font-mono">{formatBps(data.currentLiquidationThreshold)}</div>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="text-xs text-muted-foreground">Loan to value</div>
          <div className="mt-1 font-mono">{formatBps(data.ltv)}</div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
        <span>Updated {new Date(data.fetchedAt).toLocaleTimeString()}</span>
        <button
          className="rounded-full border border-border px-3 py-1 transition hover:border-muted-foreground hover:text-foreground"
          disabled={loading}
          onClick={() => void refresh()}
          type="button"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Lend, borrow, withdraw, and repay through Sherpa are live on Base mainnet
        through verified, Safe-owned contracts.
      </p>
    </div>
  );
}
