'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';

export type SherpaConnectButtonProps = {
  variant?: 'compact' | 'hero';
  className?: string;
};

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

type WalletConnector = { id: string; name?: string };

function isCoinbaseConnector(connector: WalletConnector): boolean {
  const name = connector.name?.toLowerCase() ?? '';
  return connector.id === 'coinbaseWalletSDK' || connector.id === 'coinbaseWallet' || name.includes('coinbase');
}

function isBrowserWalletConnector(connector: WalletConnector): boolean {
  if (isCoinbaseConnector(connector)) return false;
  const name = connector.name?.toLowerCase() ?? '';
  return (
    connector.id === 'injected' ||
    name.includes('rabby') ||
    name.includes('browser') ||
    name.includes('injected') ||
    name.includes('metamask')
  );
}

function browserWalletLabel(connector: WalletConnector | undefined, variant: 'compact' | 'hero'): string {
  const name = connector?.name?.toLowerCase() ?? '';
  if (name.includes('rabby')) return 'Rabby';
  return variant === 'hero' ? 'Browser wallet' : 'Browser';
}

export function ConnectButton({ variant = 'compact', className = '' }: SherpaConnectButtonProps) {
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { address, isConnected, chain } = useAccount();

  const coinbaseConnector = connectors.find(isCoinbaseConnector);
  const browserWalletConnector = connectors.find(isBrowserWalletConnector);
  const connectOptions = [
    coinbaseConnector
      ? {
          connector: coinbaseConnector,
          label: variant === 'hero' ? 'Smart Wallet' : 'Coinbase',
        }
      : undefined,
    browserWalletConnector
      ? {
          connector: browserWalletConnector,
          label: browserWalletLabel(browserWalletConnector, variant),
        }
      : undefined,
  ].filter(Boolean) as Array<{ connector: (typeof connectors)[number]; label: string }>;

  const baseClasses =
    'inline-flex min-h-11 items-center justify-center rounded-full font-medium transition focus:outline-none focus:ring-2 focus:ring-sherpa-blue/50 disabled:cursor-not-allowed disabled:opacity-60';
  const variantClasses =
    variant === 'hero'
      ? 'bg-sherpa-blue px-7 py-3 text-base text-white shadow-lg shadow-blue-950/30 hover:bg-blue-500'
      : 'border border-sherpa-surface2 bg-sherpa-surface px-4 py-2 text-sm text-sherpa-fg hover:border-sherpa-blue/70';
  const classes = `${baseClasses} ${variantClasses} ${className}`.trim();

  // Not connected
  if (!isConnected || !address) {
    if (connectOptions.length > 1) {
      return (
        <div className={`inline-flex flex-wrap items-center justify-center gap-2 ${className}`.trim()}>
          {connectOptions.map((option) => (
            <button
              key={option.connector.id}
              type="button"
              className={classes}
              onClick={() => connect({ connector: option.connector })}
              disabled={isPending}
            >
              {isPending ? 'Connecting...' : option.label}
            </button>
          ))}
        </div>
      );
    }

    const connector = connectOptions[0]?.connector;
    return (
      <button
        type="button"
        className={classes}
        onClick={() => connector && connect({ connector })}
        disabled={isPending || !connector}
      >
        {isPending ? 'Connecting...' : variant === 'hero' ? 'Connect wallet' : 'Connect'}
      </button>
    );
  }

  // Wrong chain
  if (chain && chain.id !== 84532 && chain.id !== 8453) {
    return (
      <button type="button" className={classes} onClick={() => disconnect()}>
        Unsupported network
      </button>
    );
  }

  // Connected
  return (
    <button type="button" className={classes} onClick={() => disconnect()}>
      {truncateAddress(address)}
    </button>
  );
}
