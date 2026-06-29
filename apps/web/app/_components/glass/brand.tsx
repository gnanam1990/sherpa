/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 * Glass Aurora brand atoms.
 *
 * Pure, deterministic, server-renderable. Nothing here fetches data or
 * embeds an identity — callers pass a `seed`/`symbol`/`chain`. Determinism
 * matters: these render into snapshots, so no `Math.random`/`Date.now`.
 */

/** Truncate a hex string for display: `0x036C…F7e`. Empty in → empty out. */
export function shortHex(hex: string | undefined | null, head = 6, tail = 4): string {
  if (!hex) return '';
  if (hex.length <= head + tail) return hex;
  return `${hex.slice(0, head)}…${hex.slice(-tail)}`;
}

export interface SherpaMarkProps {
  /** Square pixel size. Default 22. */
  size?: number;
}

/**
 * The Sherpa logo: #0052FF rounded ground, white mountain ridgeline, and a
 * #00E1FF cerulean summit dot. Use anywhere the brand needs to appear
 * (rail home button, Sherpa avatar, splash).
 */
export function SherpaMark({ size = 22 }: SherpaMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="Sherpa"
    >
      <rect width="32" height="32" rx="8" fill="#0052FF" />
      <path d="M5 24 L12 12 L17 19 L21 14 L27 24 Z" fill="#FFFFFF" />
      <circle cx="21" cy="9" r="2.2" fill="#00E1FF" />
    </svg>
  );
}

const AVATAR_COLORS = [
  '#0052FF',
  '#00E1FF',
  '#3CCB7F',
  '#F5A623',
  '#FF4DB8',
  '#A36EFE',
] as const;

/** Stable non-negative hash so a string seed (address/ENS) → fixed gradient. */
function hashSeed(seed: number | string): number {
  if (typeof seed === 'number') return Math.abs(Math.trunc(seed));
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export interface AvatarProps {
  /**
   * Identity seed — pass the account address/ENS so the gradient is
   * stable per user. A number also works for fixed design slots.
   */
  seed?: number | string;
  /** Square pixel size. Default 28. */
  size?: number;
}

/**
 * Deterministic gradient avatar. This is a visual placeholder derived from
 * `seed`, not a fetched profile image — callers that have a real avatar
 * URL should render that instead.
 */
export function Avatar({ seed = 0, size = 28 }: AvatarProps) {
  const i = hashSeed(seed);
  const c1 = AVATAR_COLORS[i % AVATAR_COLORS.length];
  const c2 = AVATAR_COLORS[(i + 2) % AVATAR_COLORS.length];
  return (
    <div
      className="rounded-full"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
      }}
      aria-hidden="true"
    />
  );
}

const TOKEN_MAP: Record<string, readonly [string, string]> = {
  USDC: ['#2775CA', '$'],
  ETH: ['#627EEA', 'Ξ'],
  WETH: ['#627EEA', 'Ξ'],
  DAI: ['#F4B731', 'D'],
  cbETH: ['#0052FF', 'cb'],
  AERO: ['#3D55F0', 'A'],
};

export interface TokenIconProps {
  /** Token symbol (e.g. `USDC`). Unknown symbols fall back to first letter. */
  symbol: string;
  /** Square pixel size. Default 28. */
  size?: number;
}

/** Round token glyph. Known symbols get brand colours; others a neutral chip. */
export function TokenIcon({ symbol, size = 28 }: TokenIconProps) {
  const entry = TOKEN_MAP[symbol];
  const bg = entry ? entry[0] : '#333';
  const label = entry ? entry[1] : (symbol.slice(0, 1) || '?');
  return (
    <div
      className="flex items-center justify-center rounded-full font-mono font-semibold text-white"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.4 }}
      aria-label={symbol}
      role="img"
    >
      {label}
    </div>
  );
}

/** Network tone — drives the status dot colour on {@link ChainPill}. */
export type ChainTone = 'mainnet' | 'sepolia' | 'optimism' | 'arbitrum';

const CHAIN_DOT: Record<ChainTone, string> = {
  mainnet: '#00E1FF',
  sepolia: '#F5A623',
  optimism: '#FF453A',
  arbitrum: '#28A0F0',
};

export interface ChainPillProps {
  /** Display label, e.g. `Base` or `Base Sepolia`. */
  chain?: string;
  /** Network tone for the leading dot. Default `mainnet`. */
  tone?: ChainTone;
}

/**
 * Compact network indicator: a tone-coloured dot + chain name. Pass the
 * real chain from wagmi when wired (Phase 3); presentational here.
 */
export function ChainPill({ chain = 'Base', tone = 'mainnet' }: ChainPillProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: CHAIN_DOT[tone] }}
        aria-hidden="true"
      />
      {chain}
    </span>
  );
}
