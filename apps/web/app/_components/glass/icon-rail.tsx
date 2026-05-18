'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { SherpaMark } from './brand';
import { ROUTE_ICONS, SettingsIcon } from './icons';
import type { RouteId, RouteMeta } from './route-context';
import { useRoute } from './route-context';

/**
 * Glass Aurora left navigation rail (80px).
 *
 * Config-driven: it renders whatever route table it is given (defaulting
 * to the canonical table from {@link useRoute}), so the library stays
 * route-agnostic and the concrete nav set can be substituted when applied.
 * Active state is derived from the URL, never local state — each item is a
 * real `<Link>` so navigation, prefetch, and deep-linking just work.
 */

export interface IconRailProps {
  /**
   * Routes to show. Defaults to the canonical table from `useRoute()`.
   * Pass a subset/override to customise the rail per surface.
   */
  items?: readonly RouteMeta[];
  /**
   * Optional unread/count badge per route id (e.g. pending alerts). Only
   * provided ids show a badge — there is no fabricated default.
   */
  badges?: Partial<Record<RouteId, string | number>>;
  /**
   * Show the roadmap group as a tooltip suffix (e.g. "· Stage 2 · DeFi").
   * Default `false`.
   */
  showStageTags?: boolean;
  /**
   * Bottom-of-rail slot (settings, account avatar). When omitted only the
   * settings glyph is shown — no fake avatar identity is invented here.
   */
  footer?: ReactNode;
  /** Extra classes on the rail container (e.g. responsive visibility). */
  className?: string;
  /** Invoked after a nav link is activated (e.g. close the mobile sheet). */
  onNavigate?: () => void;
}

const GLASS_ACTIVE_CLASS = 'glass-active';

export function IconRail({
  items,
  badges,
  showStageTags = false,
  footer,
  className = '',
  onNavigate,
}: IconRailProps) {
  const { activeRoute, routes } = useRoute();
  const list = items ?? routes;

  return (
    <aside
      className={`z-10 flex w-[80px] shrink-0 flex-col items-center gap-1.5 px-3 py-5 ${className}`}
      aria-label="Primary"
    >
      <Link
        href="/"
        aria-label="Sherpa home"
        onClick={onNavigate}
        className="glass-thin mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ring-white/15"
      >
        <SherpaMark size={22} />
      </Link>
      <div className="my-1 h-px w-7 bg-white/15" aria-hidden="true" />

      <nav className="flex flex-col items-center gap-1.5" aria-label="Sections">
        {list.map((r) => {
          const Icon = ROUTE_ICONS[r.id];
          const active = r.id === activeRoute;
          const badge = badges?.[r.id];
          return (
            <Link
              key={r.id}
              href={r.href}
              title={r.label}
              aria-label={r.label}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={`group relative flex h-12 w-12 items-center justify-center rounded-2xl transition ${
                active ? GLASS_ACTIVE_CLASS : ''
              }`}
            >
              <Icon active={active} />
              {badge !== undefined && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF4DB8] px-1 font-mono text-[9px] font-semibold leading-none shadow-md">
                  {badge}
                </span>
              )}
              <span
                role="tooltip"
                className="glass-thin pointer-events-none absolute left-14 z-30 whitespace-nowrap rounded-md px-2 py-1 font-mono text-[10.5px] opacity-0 transition-opacity group-hover:opacity-100"
              >
                {r.label}
                {showStageTags && (
                  <span className="ml-1.5 opacity-60">{r.group}</span>
                )}
              </span>
              {active && (
                <span
                  className="absolute -right-3 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-full"
                  style={{
                    background: 'linear-gradient(180deg, #00E1FF, #4D80FF)',
                  }}
                  aria-hidden="true"
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-2">
        <Link
          href="/about"
          aria-label="Settings"
          title="Settings"
          onClick={onNavigate}
          className="glass-thin flex h-11 w-11 items-center justify-center rounded-2xl"
        >
          <SettingsIcon />
        </Link>
        {footer}
      </div>
    </aside>
  );
}
