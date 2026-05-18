'use client';

import { usePathname } from 'next/navigation';

/**
 * Glass Aurora route context.
 *
 * Next.js App Router file-based routing is the single source of truth for
 * "where am I". This module derives the active Glass Aurora route (and its
 * breadcrumb metadata) from `usePathname()` — there is intentionally no
 * `setRoute` setter and no in-memory screen state, so navigation state can
 * never drift from the URL (survives refresh, deep-link, back/forward).
 *
 * Components navigate with a real Next.js `<Link>`; they only *read* the
 * active route from {@link useRoute}.
 */

/** Stable identifier for every route that appears in the Glass Aurora rail. */
export type RouteId =
  | 'home'
  | 'positions'
  | 'swap'
  | 'lend'
  | 'borrow'
  | 'repay'
  | 'withdraw'
  | 'dca'
  | 'alerts'
  | 'auto-repay'
  | 'governance'
  | 'multi-chain'
  | 'session-keys'
  | 'strategies';

/** Breadcrumb + navigation metadata for a single route. */
export interface RouteMeta {
  /** Stable id used for active-state comparison. */
  readonly id: RouteId;
  /** Real pathname this route links to. */
  readonly href: string;
  /** Human label shown in the rail tooltip / breadcrumb. */
  readonly label: string;
  /** Roadmap grouping (matches docs/sherpa stage taxonomy). */
  readonly group: string;
}

/**
 * Canonical route table — the single source of truth for the rail.
 *
 * Order is deliberate: Chat first, then Stage 2 DeFi (most common intents),
 * then automation, then advanced. `/base`, `/link`, `/telegram`, `/sign`,
 * `/about` are utility routes and intentionally excluded from the rail
 * (matches Phase 4 scope; `/base` stays legacy per project Decision B).
 */
export const ROUTES: readonly RouteMeta[] = [
  { id: 'home', href: '/', label: 'Chat', group: 'Conversation' },
  { id: 'positions', href: '/positions', label: 'Portfolio', group: 'Data' },
  { id: 'swap', href: '/swap', label: 'Swap', group: 'Stage 2 · DeFi' },
  { id: 'lend', href: '/lend', label: 'Lend', group: 'Stage 2 · DeFi' },
  { id: 'borrow', href: '/borrow', label: 'Borrow', group: 'Stage 2 · DeFi' },
  { id: 'repay', href: '/repay', label: 'Repay', group: 'Stage 2 · DeFi' },
  {
    id: 'withdraw',
    href: '/withdraw',
    label: 'Withdraw',
    group: 'Stage 2 · DeFi',
  },
  { id: 'dca', href: '/dca', label: 'DCA', group: 'Stage 4 · Auto' },
  { id: 'alerts', href: '/alerts', label: 'Alerts', group: 'Stage 4 · Auto' },
  {
    id: 'auto-repay',
    href: '/auto-repay',
    label: 'Auto-Repay',
    group: 'Stage 4 · Auto',
  },
  {
    id: 'governance',
    href: '/governance',
    label: 'Governance',
    group: 'Stage 7',
  },
  {
    id: 'multi-chain',
    href: '/multi-chain',
    label: 'Multi-chain',
    group: 'Stage 5',
  },
  {
    id: 'session-keys',
    href: '/session-keys',
    label: 'Session Keys',
    group: 'Stage 5',
  },
  {
    id: 'strategies',
    href: '/strategies',
    label: 'Strategies',
    group: 'Composed',
  },
] as const;

/**
 * Resolve a pathname to a known {@link RouteId}.
 *
 * - Root (`/`) maps to `home` via exact match.
 * - Every other route matches by prefix so nested paths (e.g.
 *   `/swap/details`) still highlight their parent.
 * - Unknown paths (`/base`, `/link`, …) return `null` — the rail simply
 *   shows no active highlight rather than guessing.
 */
export function matchRoute(pathname: string | null): RouteId | null {
  if (!pathname) return null;
  if (pathname === '/') return 'home';
  // Longest href first so e.g. '/auto-repay' wins over a hypothetical '/auto'.
  const candidates = [...ROUTES]
    .filter((r) => r.href !== '/')
    .sort((a, b) => b.href.length - a.href.length);
  for (const r of candidates) {
    if (pathname === r.href || pathname.startsWith(`${r.href}/`)) {
      return r.id;
    }
  }
  return null;
}

/** Result of {@link useRoute}. */
export interface UseRouteResult {
  /** Active route id, or `null` on utility/unknown paths. */
  readonly activeRoute: RouteId | null;
  /** Full metadata for the active route, or `null`. */
  readonly routeMeta: RouteMeta | null;
  /** The canonical route table (for rail rendering). */
  readonly routes: readonly RouteMeta[];
}

/**
 * Read the active Glass Aurora route from the URL.
 *
 * Use this in the IconRail (active highlight) and TopBar (breadcrumb).
 * Prefer this over any local navigation state — it is always in sync with
 * the real router. Returns `activeRoute: null` for routes not in the rail.
 */
export function useRoute(): UseRouteResult {
  const pathname = usePathname();
  const activeRoute = matchRoute(pathname);
  const routeMeta =
    activeRoute === null
      ? null
      : (ROUTES.find((r) => r.id === activeRoute) ?? null);
  return { activeRoute, routeMeta, routes: ROUTES };
}
