/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

'use client';

import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';

export type SherpaConnectButtonProps = {
  variant?: 'compact' | 'hero';
  className?: string;
};

type RainbowConnectRenderProps = {
  account?: { displayName: string };
  chain?: { unsupported?: boolean };
  mounted: boolean;
  openAccountModal: () => void;
  openChainModal: () => void;
  openConnectModal: () => void;
};

export function ConnectButton({ variant = 'compact', className = '' }: SherpaConnectButtonProps) {
  const baseClasses =
    'inline-flex min-h-11 items-center justify-center rounded-full font-medium transition focus:outline-none focus:ring-2 focus:ring-sherpa-blue/50 disabled:cursor-not-allowed disabled:opacity-60';
  const variantClasses =
    variant === 'hero'
      ? 'bg-sherpa-blue px-7 py-3 text-base text-white shadow-lg shadow-blue-950/30 hover:bg-blue-500'
      : 'border border-sherpa-surface2 bg-sherpa-surface px-4 py-2 text-sm text-sherpa-fg hover:border-sherpa-blue/70';
  const classes = `${baseClasses} ${variantClasses} ${className}`.trim();

  return (
    <RainbowConnectButton.Custom>
      {({
        account,
        chain,
        mounted,
        openAccountModal,
        openChainModal,
        openConnectModal,
      }: RainbowConnectRenderProps) => {
        const ready = mounted;
        const connected = ready && account && chain;

        if (!ready) {
          return (
            <button type="button" className={classes} disabled>
              {variant === 'hero' ? 'Connect wallet' : 'Connect'}
            </button>
          );
        }

        if (!connected) {
          return (
            <button type="button" className={classes} onClick={openConnectModal}>
              {variant === 'hero' ? 'Connect wallet' : 'Connect'}
            </button>
          );
        }

        if (chain.unsupported) {
          return (
            <button type="button" className={classes} onClick={openChainModal}>
              Unsupported network
            </button>
          );
        }

        return (
          <button type="button" className={classes} onClick={openAccountModal}>
            {account.displayName}
          </button>
        );
      }}
    </RainbowConnectButton.Custom>
  );
}
