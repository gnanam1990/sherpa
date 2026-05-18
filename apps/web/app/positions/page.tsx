import { AppShell } from '../_components/app-shell';
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
        <PositionsView />
      </div>
    </AppShell>
  );
}
