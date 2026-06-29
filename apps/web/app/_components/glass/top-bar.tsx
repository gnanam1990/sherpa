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

import type { ReactNode } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
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
  /** Disconnect the current wallet. Wired from wagmi by the route shell. */
  onDisconnect?: () => void;
}

function accountExplorerUrl(address: string, tone?: ChainTone): string {
  const host = tone === 'sepolia' ? 'https://sepolia.basescan.org' : 'https://basescan.org';
  return `${host}/address/${address}`;
}

export function TopBar({
  account,
  chain,
  live = false,
  showBreadcrumb = true,
  showCmdK = true,
  right,
  onDisconnect,
}: TopBarProps) {
  const { routeMeta } = useRoute();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuId = useId();
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return undefined;

    function onPointerDown(event: PointerEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
    setCopied(false);
  }, [account?.address]);

  async function copyAddress() {
    if (!account?.address) return;
    await navigator.clipboard?.writeText(account.address);
    setCopied(true);
  }

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
          <div ref={accountMenuRef} className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              onClick={() => setMenuOpen((open) => !open)}
              className="glass-thin flex items-center gap-2 rounded-full px-3 py-1.5 text-left transition hover:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-[#00E1FF]/40"
            >
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
            </button>
            {menuOpen && (
              <div
                id={menuId}
                role="menu"
                aria-label="Wallet account menu"
                className="glass-thin absolute right-0 top-[calc(100%+0.5rem)] z-30 w-[min(20rem,calc(100vw-2rem))] rounded-3xl border border-white/12 bg-[#07111F]/92 p-2 text-sm shadow-2xl shadow-black/30 backdrop-blur-2xl"
              >
                <div className="px-3 py-2">
                  <div className="text-[12px] font-semibold">
                    {account.ens ?? 'Connected wallet'}
                  </div>
                  <div className="mt-1 break-all font-mono text-[11px] text-white/58">
                    {account.address}
                  </div>
                </div>
                <div className="my-1 h-px bg-white/10" aria-hidden="true" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void copyAddress()}
                  className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-white/76 transition hover:bg-white/[0.07] hover:text-white"
                >
                  <span>Copy address</span>
                  <span className="font-mono text-[10px] text-[#00E1FF]/80">
                    {copied ? 'copied' : shortHex(account.address, 4, 4)}
                  </span>
                </button>
                <a
                  role="menuitem"
                  href={accountExplorerUrl(account.address, chain?.tone)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-white/76 transition hover:bg-white/[0.07] hover:text-white"
                >
                  <span>View on Basescan</span>
                  <span aria-hidden="true">↗</span>
                </a>
                <div className="my-1 h-px bg-white/10" aria-hidden="true" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onDisconnect?.();
                    setMenuOpen(false);
                  }}
                  disabled={!onDisconnect}
                  className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <span>Disconnect</span>
                  <span aria-hidden="true">×</span>
                </button>
              </div>
            )}
          </div>
        ) : null}
        {right}
      </div>
    </div>
  );
}
