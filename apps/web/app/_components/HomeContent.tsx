'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAccount, useAccountEffect } from 'wagmi';
import { toast } from 'sonner';
import {
  ConnectButton,
  GlassActionCard,
  GlassDeviceFrame,
  GlassPill,
  GlassSurface,
  SherpaGlassMark,
} from '@sherpa/ui';
import { Prompt } from './Prompt';
import { FeatureRoadmap } from './FeatureRoadmap';
import { ThemeToggle } from './theme-toggle';

const QUICK_LINKS = [
  { href: '/base', label: 'Base App', meta: 'Mobile surface' },
  { href: '/positions', label: 'Positions', meta: 'Aave health' },
  { href: '/swap', label: 'Swap', meta: 'Base mainnet' },
  { href: '/telegram', label: 'Telegram', meta: 'Live bot' },
];

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function HomeContent() {
  const { address, isConnected } = useAccount();
  const previousAddress = useRef<`0x${string}` | undefined>(address);
  const [connectionEpoch, setConnectionEpoch] = useState(0);
  const [sessionKey, setSessionKey] = useState(0);
  const [hasConnectedBefore, setHasConnectedBefore] = useState(false);

  useEffect(() => {
    if (!isConnected || !address) return;

    setHasConnectedBefore(true);
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
        <div className="flex items-center gap-3 rounded-xl border border-sherpa-surface2 bg-sherpa-surface p-3 text-sm text-sherpa-fg shadow-lg shadow-black/30">
          <span>Wallet disconnected. Connect to continue.</span>
          <ConnectButton variant="compact" />
        </div>
      ));
    },
  });

  return (
    <GlassDeviceFrame maxWidth="wide">
      <div id="main-content" className="flex min-h-[calc(100dvh-2rem)] flex-col gap-4">
        <header className="flex items-center justify-between gap-3 rounded-[22px] border border-white/12 bg-white/[0.07] px-3 py-2.5 backdrop-blur-2xl">
          <Link className="flex min-w-0 items-center gap-3" href="/" aria-label="Sherpa home">
            <SherpaGlassMark className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight text-white">Sherpa</h1>
              <p className="truncate font-mono text-xs text-white/55">Base mainnet / web</p>
            </div>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              className="hidden rounded-xl border border-white/12 bg-white/[0.07] px-3 py-2 text-sm font-medium text-white/72 transition hover:border-[#00E1FF]/35 hover:text-white sm:inline-flex"
              href="/about"
            >
              About
            </Link>
            <ConnectButton variant="compact" />
            <ThemeToggle />
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
          <GlassSurface className="overflow-hidden p-5 sm:p-6">
            <GlassPill>main site</GlassPill>
            <div className="mt-5 max-w-2xl text-5xl font-black leading-[0.94] tracking-tight text-white drop-shadow-[0_8px_30px_rgba(0,225,255,0.28)] sm:text-6xl">
              Plain English. Real Base actions.
            </div>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/72">
              Send, swap, lend, borrow, repay, inspect positions, and manage automation from one
              guarded Sherpa surface. Every state-changing action still requires wallet
              confirmation.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <GlassPill className="normal-case tracking-normal">Base mainnet</GlassPill>
              <GlassPill className="normal-case tracking-normal">Verified contracts</GlassPill>
              <GlassPill className="normal-case tracking-normal">Smart wallet ready</GlassPill>
            </div>
          </GlassSurface>

          <GlassSurface className="p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/55">
                  Intent
                </div>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">Ask Sherpa</h2>
                <p className="mt-1 text-sm leading-6 text-white/58">
                  Type what you want. Sherpa previews the action before signing.
                </p>
              </div>
              {!isConnected ? <ConnectButton variant="hero" /> : null}
              {isConnected && address ? (
                <div className="rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 font-mono text-xs text-white/62">
                  {truncateAddress(address)}
                </div>
              ) : null}
            </div>

            <Prompt
              connectionEpoch={connectionEpoch}
              key={sessionKey}
              isConnected={isConnected}
              userAddress={address}
              disconnectedCopy={
                hasConnectedBefore ? 'Connect wallet to continue' : 'Connect wallet to start'
              }
            />
          </GlassSurface>
        </section>

        <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_LINKS.map((item) => (
            <GlassActionCard href={item.href} key={item.href} label={item.label} meta={item.meta} />
          ))}
        </section>

        <GlassSurface className="p-4 sm:p-5">
          <FeatureRoadmap />
        </GlassSurface>

        <footer className="mt-auto pb-[env(safe-area-inset-bottom)] text-center font-mono text-[11px] text-white/45">
          Web / Base App / Farcaster / Telegram surfaces share the same Sherpa engine
        </footer>
      </div>
    </GlassDeviceFrame>
  );
}
