'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './theme-toggle';

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Compose intent', subtitle: 'Type plain English. Sherpa builds the onchain action.' },
  '/positions': { title: 'Positions', subtitle: 'Aave V3 account data on Base mainnet.' },
  '/swap': { title: 'Swap', subtitle: 'Token-for-token via the guarded SherpaRouter.' },
  '/lend': { title: 'Lend', subtitle: 'Supply assets to Aave V3.' },
  '/borrow': { title: 'Borrow', subtitle: 'Borrow against supplied collateral.' },
  '/repay': { title: 'Repay', subtitle: 'Pay down Aave V3 debt.' },
  '/withdraw': { title: 'Withdraw', subtitle: 'Withdraw supplied collateral.' },
  '/dca': { title: 'DCA', subtitle: 'Recurring intent automation.' },
  '/alerts': { title: 'Alerts', subtitle: 'Price, balance, and health notifications.' },
  '/auto-repay': { title: 'Auto-repay', subtitle: 'Liquidation protection automation.' },
  '/session-keys': { title: 'Session keys', subtitle: 'Scoped automation permissions.' },
};

function getPageMeta(pathname: string) {
  return PAGE_META[pathname] ?? { title: 'Sherpa', subtitle: 'Base mainnet' };
}

export function TopBar() {
  const pathname = usePathname();
  const page = getPageMeta(pathname);

  return (
    <header className="flex min-h-[73px] items-center justify-between gap-4 border-b border-border bg-background px-4 py-3 sm:px-6">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-bold tracking-tight text-foreground sm:text-xl">
          {page.title}
        </h1>
        <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
          Base mainnet · {page.subtitle}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Link
          className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground sm:inline-flex"
          href="/about"
        >
          About
        </Link>
        <ConnectButton.Custom>
          {({ account, chain, mounted, openAccountModal, openChainModal, openConnectModal }) => {
            if (!mounted) return <div className="h-9 w-32 rounded-lg bg-muted" />;

            if (!account || !chain) {
              return (
                <button className="base-btn text-sm" onClick={openConnectModal} type="button">
                  Connect
                </button>
              );
            }

            if (chain.unsupported) {
              return (
                <button
                  className="rounded-lg bg-base-red px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                  onClick={openChainModal}
                  type="button"
                >
                  Wrong network
                </button>
              );
            }

            return (
              <button
                className="flex h-9 items-center gap-2 rounded-lg bg-muted px-3 text-sm font-medium text-foreground transition hover:bg-border"
                onClick={openAccountModal}
                type="button"
              >
                <span className="h-2 w-2 rounded-full bg-base-green shadow-[0_0_8px_rgba(0,211,149,0.9)]" />
                <span className="hidden font-mono sm:inline">{account.displayName}</span>
                <span className="font-mono sm:hidden">Wallet</span>
              </button>
            );
          }}
        </ConnectButton.Custom>
        <ThemeToggle />
      </div>
    </header>
  );
}
