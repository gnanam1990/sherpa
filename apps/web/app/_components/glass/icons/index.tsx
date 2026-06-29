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
import type { RouteId } from '../route-context';

/**
 * Glass Aurora icon set.
 *
 * Every icon is a thin stroke glyph that inherits its colour from the
 * active/idle state. Icons are decorative (`aria-hidden`); the interactive
 * wrapper (rail button / link) carries the accessible label, so the SVG
 * itself never needs a title. Use {@link ROUTE_ICONS} to look up the glyph
 * for a rail route, or import a named icon directly for one-off use.
 */

/** Shared props for every icon. */
export interface IconProps {
  /** Highlight colour when the icon represents the current route. */
  active?: boolean;
  /** Pixel box size (square). Defaults to 20. */
  size?: number;
}

const ACTIVE = '#A6F2FF';
const IDLE = 'rgba(255,255,255,0.7)';

/** Internal stroke-icon frame. Not exported — use the named icons. */
function Stroke({
  children,
  size = 20,
  active,
}: {
  children: ReactNode;
  size?: number;
  active?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', color: active ? ACTIVE : IDLE }}
    >
      {children}
    </svg>
  );
}

export function ChatIcon({ active, size }: IconProps) {
  return (
    <Stroke active={active} size={size}>
      <path d="M21 12a8 8 0 1 1-3.2-6.4L21 4l-1 4.5A8 8 0 0 1 21 12Z" />
    </Stroke>
  );
}

export function PortfolioIcon({ active, size }: IconProps) {
  return (
    <Stroke active={active} size={size}>
      <path d="M3 21V8" />
      <path d="M9 21V12" />
      <path d="M15 21V4" />
      <path d="M21 21V14" />
    </Stroke>
  );
}

export function SwapIcon({ active, size }: IconProps) {
  return (
    <Stroke active={active} size={size}>
      <path d="M7 4 4 7l3 3" />
      <path d="M4 7h12" />
      <path d="m17 20 3-3-3-3" />
      <path d="M20 17H8" />
    </Stroke>
  );
}

export function LendIcon({ active, size }: IconProps) {
  return (
    <Stroke active={active} size={size}>
      <path d="M12 3v10" />
      <path d="m8 9 4 4 4-4" />
      <path d="M4 17h16v3H4z" />
    </Stroke>
  );
}

export function BorrowIcon({ active, size }: IconProps) {
  return (
    <Stroke active={active} size={size}>
      <path d="M12 21V11" />
      <path d="m8 15 4-4 4 4" />
      <path d="M4 4h16v3H4z" />
    </Stroke>
  );
}

export function RepayIcon({ active, size }: IconProps) {
  return (
    <Stroke active={active} size={size}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v4h4" />
    </Stroke>
  );
}

export function WithdrawIcon({ active, size }: IconProps) {
  return (
    <Stroke active={active} size={size}>
      <path d="M12 15V4" />
      <path d="m8 8 4-4 4 4" />
      <path d="M4 14v6h16v-6" />
    </Stroke>
  );
}

export function ClockIcon({ active, size }: IconProps) {
  return (
    <Stroke active={active} size={size}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Stroke>
  );
}

export function BellIcon({ active, size }: IconProps) {
  return (
    <Stroke active={active} size={size}>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 7 2 7H4s2-2 2-7Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </Stroke>
  );
}

export function ShieldIcon({ active, size }: IconProps) {
  return (
    <Stroke active={active} size={size}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </Stroke>
  );
}

export function GovernanceIcon({ active, size }: IconProps) {
  return (
    <Stroke active={active} size={size}>
      <path d="M12 3v18" />
      <path d="M5 7h14" />
      <path d="M5 7 3 13a3 3 0 0 0 6 0L7 7" />
      <path d="M17 7l-2 6a3 3 0 0 0 6 0l-2-6" />
    </Stroke>
  );
}

export function GlobeIcon({ active, size }: IconProps) {
  return (
    <Stroke active={active} size={size}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" />
    </Stroke>
  );
}

export function KeyIcon({ active, size }: IconProps) {
  return (
    <Stroke active={active} size={size}>
      <circle cx="8" cy="8" r="4" />
      <path d="m11 11 9 9" />
      <path d="m16 16 2-2" />
      <path d="m19 19 2-2" />
    </Stroke>
  );
}

export function LayersIcon({ active, size }: IconProps) {
  return (
    <Stroke active={active} size={size}>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </Stroke>
  );
}

export function SettingsIcon({ active, size }: IconProps) {
  return (
    <Stroke active={active} size={size}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8 2 2 0 1 1-2.8 2.8 1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5 2 2 0 1 1-4 0 1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3 2 2 0 1 1-2.8-2.8 1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1 2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8 2 2 0 1 1 2.8-2.8 1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5 2 2 0 1 1 4 0 1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3 2 2 0 1 1 2.8 2.8 1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1 2 2 0 1 1 0 4 1.7 1.7 0 0 0-1.5 1Z" />
    </Stroke>
  );
}

export function InfoIcon({ active, size }: IconProps) {
  return (
    <Stroke active={active} size={size}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </Stroke>
  );
}

/** Filled arrow used inside cerulean action buttons (dark-on-light). */
export function ArrowIcon({
  size = 14,
  color = '#06081A',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

/** Check glyph used in safety / confirmation surfaces. */
export function CheckIcon({
  size = 12,
  color = '#0B0F38',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

/** Component type every route icon conforms to. */
export type RouteIconComponent = (props: IconProps) => ReactNode;

/**
 * Glyph for each rail route. The IconRail uses this to render the right
 * icon for whatever route table it is given.
 */
export const ROUTE_ICONS: Record<RouteId, RouteIconComponent> = {
  home: ChatIcon,
  positions: PortfolioIcon,
  swap: SwapIcon,
  lend: LendIcon,
  borrow: BorrowIcon,
  repay: RepayIcon,
  withdraw: WithdrawIcon,
  dca: ClockIcon,
  alerts: BellIcon,
  'auto-repay': ShieldIcon,
  governance: GovernanceIcon,
  'multi-chain': GlobeIcon,
  'session-keys': KeyIcon,
  strategies: LayersIcon,
};
