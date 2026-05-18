'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ConnectButton } from '@sherpa/ui';
import { toast } from 'sonner';
import { useAccount, useAccountEffect } from 'wagmi';
import { Prompt } from './Prompt';
import { ThemeToggle } from './theme-toggle';

const QUICK_LINKS = [
  { href: '/positions', label: 'Positions', meta: 'Aave health' },
  { href: '/swap', label: 'Swap', meta: 'Base mainnet' },
  { href: '/lend', label: 'Lend', meta: 'Aave V3' },
  { href: '/alerts', label: 'Alerts', meta: 'Beta' },
];

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function BaseAppContent() {
  const { address, isConnected } = useAccount();
  const previousAddress = useRef<`0x${string}` | undefined>(address);
  const [connectionEpoch, setConnectionEpoch] = useState(0);
  const [sessionKey, setSessionKey] = useState(0);

  useEffect(() => {
    if (!isConnected || !address) return;

    if (
      previousAddress.current &&
      previousAddress.current.toLowerCase() !== address.toLowerCase()
    ) {
      setConnectionEpoch((epoch) => epoch + 1);
      setSessionKey((key) => key + 1);
    }

    previousAddress.current = address;
  }, [address, isConnected]);

  useAccountEffect({
    onDisconnect() {
      setConnectionEpoch((epoch) => epoch + 1);
      toast.custom(() => (
        <div className="rounded-xl border border-border bg-card p-3 text-sm text-foreground shadow-card-soft">
          Wallet disconnected.
        </div>
      ));
    },
  });

  return (
    <main
      className="min-h-[100dvh] bg-background px-4 pb-6 pt-[max(1rem,env(safe-area-inset-top))] text-foreground"
      id="main-content"
    >
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-md flex-col gap-4">
        <header className="flex items-center justify-between gap-3">
          <Link className="flex min-w-0 items-center gap-3" href="/" aria-label="Sherpa home">
            <Image
              alt=""
              className="rounded-xl"
              height={40}
              priority
              src="/sherpa-icon-192.svg"
              width={40}
            />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight">Sherpa</h1>
              <p className="truncate font-mono text-xs text-muted-foreground">Base App / mainnet</p>
            </div>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <ConnectButton variant="compact" />
            <ThemeToggle />
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-base-blue/30 bg-base-blue text-white shadow-glow-blue">
          <div className="relative p-5">
            <div className="absolute right-[-48px] top-[-48px] h-32 w-32 rounded-full bg-base-cerulean/30 blur-2xl" />
            <div className="relative">
              <div className="font-mono text-xs uppercase tracking-[0.18em] text-white/70">
                Base App surface
              </div>
              <div className="mt-3 text-3xl font-black tracking-tight">Plain English to Base</div>
              <p className="mt-2 text-sm leading-6 text-white/80">
                Send, swap, lend, borrow, repay, and inspect positions from one mobile-first intent
                surface.
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2">
          {QUICK_LINKS.map((item) => (
            <Link
              className="rounded-xl border border-border bg-card p-3 transition hover:border-base-blue/50"
              href={item.href}
              key={item.href}
            >
              <div className="text-sm font-semibold">{item.label}</div>
              <div className="mt-1 font-mono text-[11px] text-muted-foreground">{item.meta}</div>
            </Link>
          ))}
        </section>

        <section className="base-card-soft p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="meta-label mb-1">Intent</div>
              <h2 className="text-lg font-bold tracking-tight">Ask Sherpa</h2>
            </div>
            {isConnected && address ? (
              <div className="rounded-full border border-border bg-muted px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
                {truncateAddress(address)}
              </div>
            ) : null}
          </div>
          <Prompt
            connectionEpoch={connectionEpoch}
            disconnectedCopy="Connect wallet"
            isConnected={isConnected}
            key={sessionKey}
            userAddress={address}
          />
        </section>

        <footer className="mt-auto pb-[env(safe-area-inset-bottom)] text-center font-mono text-[11px] text-muted-foreground">
          Verified Base mainnet contracts / wallet confirmation required
        </footer>
      </div>
    </main>
  );
}
