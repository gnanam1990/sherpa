'use client';

import { useEffect, useRef, useState } from 'react';
import { useAccount, useAccountEffect } from 'wagmi';
import { toast } from 'sonner';
import { ConnectButton } from '@sherpa/ui';
import { Prompt } from './Prompt';

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
    <main
      id="main-content"
      className="flex h-[100dvh] flex-col items-center gap-4 overflow-hidden bg-sherpa-bg px-4 py-4 text-sherpa-fg sm:px-6"
    >
      <header className="flex w-full max-w-5xl items-center justify-between gap-4">
        <span className="text-sm font-semibold tracking-[-0.02em] text-sherpa-blue">Sherpa</span>
        <nav className="flex items-center gap-3" aria-label="Primary">
          <a
            href="/about"
            className="rounded-full px-3 py-1 text-sm text-sherpa-muted transition hover:text-sherpa-fg"
          >
            About
          </a>
          <ConnectButton variant="compact" />
        </nav>
      </header>

      <section className="flex w-full max-w-2xl flex-col items-center gap-3 text-center">
        <h1 className="m-0 text-5xl font-semibold tracking-[-0.04em] text-sherpa-blue sm:text-6xl">
          Sherpa
        </h1>
        <p className="max-w-md text-base text-sherpa-muted">
          Type anything. Sherpa does it on Base.
        </p>
        {!isConnected ? <ConnectButton variant="hero" /> : null}
        {isConnected && address ? (
          <div className="rounded-full border border-sherpa-surface2 bg-sherpa-surface px-4 py-2 text-sm text-sherpa-muted">
            Connected as{' '}
            <span className="font-medium text-sherpa-fg">{truncateAddress(address)}</span>
          </div>
        ) : null}
      </section>

      <Prompt
        connectionEpoch={connectionEpoch}
        key={sessionKey}
        isConnected={isConnected}
        userAddress={address}
        disconnectedCopy={
          hasConnectedBefore ? 'Connect wallet to continue' : 'Connect wallet to start'
        }
      />

      <footer className="text-xs text-sherpa-muted">
        Stage 1 · Base Sepolia · <span className="text-sherpa-success">sponsored gas</span>
      </footer>
    </main>
  );
}
