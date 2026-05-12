'use client';

import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit/components';

export type SherpaConnectButtonProps = {
  variant?: 'compact' | 'hero';
  className?: string;
};

type RainbowButtonRenderProps = {
  account?: { address: string };
  chain?: { unsupported?: boolean };
  mounted: boolean;
  openAccountModal: () => void;
  openChainModal: () => void;
  openConnectModal: () => void;
};

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function ConnectButton({ variant = 'compact', className = '' }: SherpaConnectButtonProps) {
  return (
    <RainbowConnectButton.Custom>
      {({
        account,
        chain,
        mounted,
        openAccountModal,
        openChainModal,
        openConnectModal,
      }: RainbowButtonRenderProps) => {
        const connected = mounted && account && chain;
        const baseClasses =
          'inline-flex min-h-11 items-center justify-center rounded-full font-medium transition focus:outline-none focus:ring-2 focus:ring-sherpa-blue/50 disabled:cursor-not-allowed disabled:opacity-60';
        const variantClasses =
          variant === 'hero'
            ? 'bg-sherpa-blue px-7 py-3 text-base text-white shadow-lg shadow-blue-950/30 hover:bg-blue-500'
            : 'border border-sherpa-surface2 bg-sherpa-surface px-4 py-2 text-sm text-sherpa-fg hover:border-sherpa-blue/70';
        const classes = `${baseClasses} ${variantClasses} ${className}`.trim();

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
              Switch network
            </button>
          );
        }

        return (
          <button type="button" className={classes} onClick={openAccountModal}>
            {truncateAddress(account.address)}
          </button>
        );
      }}
    </RainbowConnectButton.Custom>
  );
}
