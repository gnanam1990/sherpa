'use client';

import Link from 'next/link';
import { useAccount } from 'wagmi';

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function RightPanel() {
  const { address, isConnected } = useAccount();

  return (
    <aside className="flex h-full min-h-screen flex-col bg-card">
      <div className="border-b border-border p-5">
        <div className="meta-label mb-2">Account context</div>
        <h2 className="text-lg font-bold tracking-tight">Account context</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Read-only shortcuts. No values are fabricated in this panel.
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="base-card-soft p-4">
          <div className="meta-label mb-2">Wallet</div>
          {isConnected && address ? (
            <>
              <div className="font-mono text-sm text-foreground">{truncateAddress(address)}</div>
              <p className="mt-2 text-xs text-muted-foreground">
                Use the full positions page to fetch Aave data from the API.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Connect a wallet to unlock account-specific views.
            </p>
          )}
        </div>

        <div className="base-card-soft p-4">
          <div className="meta-label mb-2">Quick links</div>
          <div className="space-y-2 text-sm">
            <Link className="block text-base-blue transition hover:text-base-blue-light" href="/positions">
              Positions
            </Link>
            <Link className="block text-base-blue transition hover:text-base-blue-light" href="/alerts">
              Alerts
            </Link>
            <Link className="block text-base-blue transition hover:text-base-blue-light" href="/dca">
              DCA schedules
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-border p-4 text-xs text-muted-foreground">
        <span>Live position reads stay on the dedicated page to avoid hidden background calls.</span>
      </div>
    </aside>
  );
}
