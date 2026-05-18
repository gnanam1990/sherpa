'use client';

import Link from 'next/link';
import { useAccount } from 'wagmi';
import { PositionsView } from './PositionsView';

export function RightPanel() {
  const { isConnected } = useAccount();

  return (
    <aside className="flex h-full min-h-screen flex-col bg-card">
      <div className="border-b border-border p-5">
        <div className="meta-label mb-2">Account context</div>
        <h2 className="text-lg font-bold tracking-tight">Live positions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Read-only Aave data. No values are fabricated.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="scale-[0.94] origin-top">
          <PositionsView />
        </div>
      </div>

      <div className="border-t border-border p-4 text-xs text-muted-foreground">
        {isConnected ? (
          <Link className="text-base-blue transition hover:text-base-blue-light" href="/positions">
            Open full positions view
          </Link>
        ) : (
          <span>Connect a wallet to populate the context panel.</span>
        )}
      </div>
    </aside>
  );
}
