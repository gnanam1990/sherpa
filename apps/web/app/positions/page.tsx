import { AppShell } from '../_components/app-shell';
import { KpiTile } from '../_components/kpi-tile';
import { NetWorthCard } from '../_components/net-worth-card';
import { PositionsView } from '../_components/PositionsView';

export default function PositionsPage() {
  return (
    <AppShell hideRightPanel>
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <p className="meta-label mb-2">Account</p>
          <h2 className="text-3xl font-bold tracking-tight">Aave Positions</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Read-only view of your Aave V3 position on Base mainnet.
          </p>
        </div>
        <div className="mb-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
          <NetWorthCard value={null} network="Base mainnet" />
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <KpiTile label="Collateral" value={null} meta="Read from Aave" tone="success" />
            <KpiTile label="Debt" value={null} meta="Read from Aave" tone="warning" />
            <KpiTile label="Available" value={null} meta="Connect wallet" />
          </div>
        </div>
        <PositionsView />
      </div>
    </AppShell>
  );
}
