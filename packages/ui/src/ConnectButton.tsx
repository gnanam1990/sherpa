'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';

export type SherpaConnectButtonProps = {
  variant?: 'compact' | 'hero';
  className?: string;
};

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function ConnectButton({ variant = 'compact', className = '' }: SherpaConnectButtonProps) {
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { address, isConnected, chain } = useAccount();

  const coinbaseConnector = connectors.find(
    (c: { id: string; name?: string }) => c.id === 'coinbaseWalletSDK' || c.id === 'coinbaseWallet' || c.name?.toLowerCase().includes('coinbase'),
  );

  const baseClasses =
    'inline-flex min-h-11 items-center justify-center rounded-full font-medium transition focus:outline-none focus:ring-2 focus:ring-sherpa-blue/50 disabled:cursor-not-allowed disabled:opacity-60';
  const variantClasses =
    variant === 'hero'
      ? 'bg-sherpa-blue px-7 py-3 text-base text-white shadow-lg shadow-blue-950/30 hover:bg-blue-500'
      : 'border border-sherpa-surface2 bg-sherpa-surface px-4 py-2 text-sm text-sherpa-fg hover:border-sherpa-blue/70';
  const classes = `${baseClasses} ${variantClasses} ${className}`.trim();

  // Not connected
  if (!isConnected || !address) {
    return (
      <button
        type="button"
        className={classes}
        onClick={() => coinbaseConnector && connect({ connector: coinbaseConnector })}
        disabled={isPending || !coinbaseConnector}
      >
        {isPending ? 'Connecting...' : variant === 'hero' ? 'Connect wallet' : 'Connect'}
      </button>
    );
  }

  // Wrong chain
  if (chain && chain.id !== 84532) {
    return (
      <button type="button" className={classes} onClick={() => disconnect()}>
        Switch to Base Sepolia
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
