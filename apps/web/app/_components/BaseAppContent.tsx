'use client';


/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  ConnectButton,
  GlassActionCard,
  GlassDeviceFrame,
  GlassPill,
  GlassSurface,
  SherpaGlassMark,
} from '@sherpa/ui';
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
        <div className="rounded-xl border border-white/15 bg-[#0B0F38] p-3 text-sm text-white shadow-card-soft">
          Wallet disconnected.
        </div>
      ));
    },
  });

  return (
    <GlassDeviceFrame>
      <div className="flex min-h-[calc(100dvh-2rem)] flex-col gap-4" id="main-content">
        <header className="flex items-center justify-between gap-3 rounded-[22px] border border-white/12 bg-white/[0.07] px-3 py-2.5 backdrop-blur-2xl">
          <Link className="flex min-w-0 items-center gap-3" href="/" aria-label="Sherpa Base App / mainnet home">
            <SherpaGlassMark className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight text-white">Sherpa</h1>
              <p className="truncate font-mono text-xs text-white/55">Base App / mainnet</p>
            </div>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <ConnectButton variant="compact" />
            <ThemeToggle />
          </div>
        </header>

        <GlassSurface className="overflow-hidden p-5">
          <div className="relative">
            <GlassPill>Base App surface</GlassPill>
            <div className="mt-4 max-w-[14rem] text-4xl font-black leading-[0.98] tracking-tight text-white drop-shadow-[0_8px_30px_rgba(0,225,255,0.28)]">
              Plain English to Base
            </div>
            <p className="mt-3 text-sm leading-6 text-white/72">
              Send, swap, lend, borrow, repay, and inspect positions from one mobile-first intent
              surface.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <GlassPill className="normal-case tracking-normal">Wallet confirmation</GlassPill>
              <GlassPill className="normal-case tracking-normal">Verified contracts</GlassPill>
            </div>
          </div>
        </GlassSurface>

        <section className="grid grid-cols-2 gap-2">
          {QUICK_LINKS.map((item) => (
            <GlassActionCard href={item.href} key={item.href} label={item.label} meta={item.meta} />
          ))}
        </section>

        <GlassSurface className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/55">
                Intent
              </div>
              <h2 className="mt-1 text-lg font-bold tracking-tight text-white">Ask Sherpa</h2>
            </div>
            {isConnected && address ? (
              <div className="rounded-full border border-white/15 bg-white/[0.07] px-2.5 py-1 font-mono text-[11px] text-white/62">
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
        </GlassSurface>

        <footer className="mt-auto pb-[env(safe-area-inset-bottom)] text-center font-mono text-[11px] text-white/45">
          Verified Base mainnet contracts / wallet confirmation required
        </footer>
      </div>
    </GlassDeviceFrame>
  );
}
