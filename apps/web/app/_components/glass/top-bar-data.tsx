'use client';

import { useAccount, useBalance, useChainId, useEnsName } from 'wagmi';
import { ConnectButton } from '@sherpa/ui';
import type { ChainTone } from './brand';
import type { TopBarProps } from './top-bar';

/**
 * Shared TopBar data wiring for Glass Aurora routes.
 *
 * One place that turns the real wagmi reads (account / ENS / balance /
 * chain) into {@link TopBarProps}, so every restyled route gets identical,
 * honest chrome without duplicating the hooks. Disconnected → no account
 * and a Connect button in the right slot (never a fake address).
 */

/** Map a numeric chain id to the Glass chain pill label + tone. */
export function chainMetaFromId(chainId: number): {
  label: string;
  tone: ChainTone;
} {
  if (chainId === 84532) return { label: 'Base Sepolia', tone: 'sepolia' };
  return { label: 'Base', tone: 'mainnet' };
}

export type GlassTopBarData = Pick<
  TopBarProps,
  'account' | 'chain' | 'live' | 'right'
> & { isConnected: boolean; address?: `0x${string}` };

export function useGlassTopBar(): GlassTopBarData {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: ensName } = useEnsName({ address, chainId: 1 });
  const { data: balance } = useBalance({ address });

  const balanceLabel = balance
    ? `${Number(balance.formatted).toFixed(4)} ${balance.symbol}`
    : undefined;

  return {
    isConnected,
    address,
    account:
      isConnected && address
        ? { ens: ensName ?? null, address, balanceUsd: balanceLabel }
        : null,
    chain: chainMetaFromId(chainId),
    live: isConnected,
    right: !isConnected ? <ConnectButton variant="compact" /> : undefined,
  };
}
