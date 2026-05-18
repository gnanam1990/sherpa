'use client';

import { useEffect, useRef, useState } from 'react';
import { useAccount, useAccountEffect } from 'wagmi';
import { toast } from 'sonner';
import { ConnectButton } from '@sherpa/ui';
import { AppShell } from './app-shell';
import { Prompt } from './Prompt';
import { FeatureRoadmap } from './FeatureRoadmap';
import { KpiTile } from './kpi-tile';
import { NetWorthCard } from './net-worth-card';

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
    <AppShell>
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <NetWorthCard value={null} network="Base mainnet" />

        <div className="grid gap-3 sm:grid-cols-3">
          <KpiTile label="Supplied" value={null} meta="Aave V3" tone="success" />
          <KpiTile label="Borrowed" value={null} meta="Health guarded" tone="warning" />
          <KpiTile label="Net APY" value={null} meta="Connect wallet" />
        </div>

        <section className="base-card-soft p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="meta-label mb-1">Compose intent</div>
              <h2 className="text-2xl font-bold tracking-tight">What do you want to do?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Send, swap, lend, borrow, repay, or check account state in plain English.
              </p>
            </div>
            {!isConnected ? <ConnectButton variant="hero" /> : null}
            {isConnected && address ? (
              <div className="rounded-full border border-border bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground">
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
        </section>

        <footer className="text-center font-mono text-xs text-muted-foreground">
          Base mainnet public / Smart Wallet confirmation for every action
        </footer>

        <FeatureRoadmap />
      </div>
    </AppShell>
  );
}
