'use client';

import type { ReactNode } from 'react';
import { Avatar, ChainPill, shortHex } from './brand';
import type { ChainTone } from './brand';
import { useRoute } from './route-context';

/**
 * Glass Aurora top bar.
 *
 * Pure presentational chrome: the `sherpa` wordmark, an optional chain
 * pill + live dot, a route breadcrumb (read from the URL via
 * {@link useRoute}, never fabricated), and an account pill. It holds NO
 * identity of its own — pass `account` (real wagmi/ENS data is wired in
 * Phase 3). When `account` is absent it renders the `right` slot, which is
 * where a Connect Wallet button goes.
 */

export interface TopBarAccount {
  /** Resolved ENS/basename, or `null` when none resolves. */
  ens?: string | null;
  /** Checksummed address. */
  address: string;
  /** Pre-formatted balance string, e.g. `$8,427.14`. Optional. */
  balanceUsd?: string;
}

export interface TopBarProps {
  /** Connected account, or `null`/absent when disconnected. */
  account?: TopBarAccount | null;
  /** Network pill. Omit to hide. */
  chain?: { label: string; tone?: ChainTone };
  /** Show the green "live" indicator. Default `false`. */
  live?: boolean;
  /** Render the `group · route` breadcrumb from the URL. Default `true`. */
  showBreadcrumb?: boolean;
  /** Show the ⌘K hint chip. Default `true`. */
  showCmdK?: boolean;
  /**
   * Right-slot content. Rendered after the account pill, or *instead* of
   * it when disconnected — put `<ConnectWallet />` here.
   */
  right?: ReactNode;
}

export function TopBar({
  account,
  chain,
  live = false,
  showBreadcrumb = true,
  showCmdK = true,
  right,
}: TopBarProps) {
  const { routeMeta } = useRoute();
  return (
    <div className="relative z-10 flex shrink-0 items-center justify-between px-7 pt-5">
      <div className="flex items-center gap-3">
        <span className="font-serif text-[30px] italic leading-none">sherpa</span>
        {chain && (
          <ChainPill chain={chain.label} tone={chain.tone ?? 'mainnet'} />
        )}
        {live && (
          <span className="glass-thin rounded-full px-2 py-0.5 font-mono text-[10px]">
            <span
              className="mr-1 inline-block h-1.5 w-1.5 -translate-y-[1px] rounded-full bg-emerald-300 align-middle"
              aria-hidden="true"
            />
            live
          </span>
        )}
        {showBreadcrumb && routeMeta && (
          <>
            <span className="mx-1 text-white/30" aria-hidden="true">
              /
            </span>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] opacity-75">
              {routeMeta.group}
            </span>
            <span className="text-white/30" aria-hidden="true">
              ·
            </span>
            <span className="text-[13px] font-medium">{routeMeta.label}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        {showCmdK && (
          <span className="glass-thin rounded-full px-2.5 py-1.5 font-mono text-[10.5px]">
            ⌘K
          </span>
        )}
        {account ? (
          <div className="glass-thin flex items-center gap-2 rounded-full px-3 py-1.5">
            <Avatar seed={account.ens ?? account.address} size={22} />
            <div className="text-[12px] font-semibold leading-tight">
              {account.ens ?? shortHex(account.address)}
            </div>
            <span className="h-3 w-px bg-white/20" aria-hidden="true" />
            <div className="font-mono text-[10.5px] opacity-70">
              {shortHex(account.address)}
            </div>
            {account.balanceUsd && (
              <>
                <span className="h-3 w-px bg-white/20" aria-hidden="true" />
                <div className="font-mono text-[10.5px]">
                  {account.balanceUsd}
                </div>
              </>
            )}
          </div>
        ) : null}
        {right}
      </div>
    </div>
  );
}
