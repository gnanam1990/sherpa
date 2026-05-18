'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
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
      className={`group/rail relative z-10 flex w-[80px] shrink-0 flex-col gap-1.5 overflow-hidden border-r border-white/10 bg-[#050A13]/22 px-3 py-5 backdrop-blur-xl transition-[width] duration-200 ease-out hover:w-[280px] focus-within:w-[280px] ${className}`}
      aria-label="Primary"
    >
      <Link
        href="/"
        aria-label="Sherpa home"
        onClick={onNavigate}
        className="glass-thin mb-3 flex h-12 w-full items-center rounded-2xl ring-1 ring-white/15 transition hover:bg-white/[0.07]"
      >
        <span className="flex h-12 w-14 shrink-0 items-center justify-center">
          <Image
            src="/sherpa-icon-192.png"
            alt=""
            width={34}
            height={34}
            className="h-[34px] w-[34px] rounded-xl object-contain"
            priority
          />
        </span>
        <span className="min-w-0 translate-x-1 overflow-hidden opacity-0 transition duration-150 group-hover/rail:translate-x-0 group-hover/rail:opacity-100 group-focus-within/rail:translate-x-0 group-focus-within/rail:opacity-100">
          <span className="block truncate text-sm font-semibold text-white">Sherpa</span>
          <span className="block truncate font-mono text-[10px] uppercase tracking-[0.16em] text-[#00E1FF]/70">
            Base mainnet
          </span>
        </span>
      </Link>
      <div
        className="mx-auto my-1 h-px w-7 bg-white/15 transition-all duration-200 group-hover/rail:w-full group-focus-within/rail:w-full"
        aria-hidden="true"
      />

      <nav
        className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Sections"
      >
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
              className={`group/item relative flex h-12 w-full items-center rounded-2xl transition ${
                active
                  ? `${GLASS_ACTIVE_CLASS} text-white`
                  : 'text-white/62 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <span className="flex h-12 w-14 shrink-0 items-center justify-center">
                <Icon active={active} />
              </span>
              <span className="min-w-0 flex-1 translate-x-1 truncate text-sm font-medium opacity-0 transition duration-150 group-hover/rail:translate-x-0 group-hover/rail:opacity-100 group-focus-within/rail:translate-x-0 group-focus-within/rail:opacity-100">
                {r.label}
              </span>
              {showStageTags && (
                <span className="mr-3 hidden max-w-[86px] truncate font-mono text-[10px] text-white/36 opacity-0 transition duration-150 group-hover/rail:block group-hover/rail:opacity-100 group-focus-within/rail:block group-focus-within/rail:opacity-100">
                  {r.group}
                </span>
              )}
              {badge !== undefined && (
                <span className="mr-3 flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-[#FF4DB8] px-1 font-mono text-[9px] font-semibold leading-none text-white opacity-0 shadow-md transition duration-150 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100">
                  {badge}
                </span>
              )}
              {active && (
                <span
                  className="absolute right-1.5 top-1/2 h-6 w-[2px] -translate-y-1/2 rounded-full"
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

      <div className="mt-auto flex flex-col gap-2 pt-2">
        <Link
          href="/about"
          aria-label="Settings"
          title="Settings"
          onClick={onNavigate}
          className="glass-thin flex h-11 w-full items-center rounded-2xl transition hover:bg-white/[0.07]"
        >
          <span className="flex h-11 w-14 shrink-0 items-center justify-center">
            <SettingsIcon />
          </span>
          <span className="min-w-0 translate-x-1 truncate text-sm font-medium text-white/62 opacity-0 transition duration-150 group-hover/rail:translate-x-0 group-hover/rail:opacity-100 group-focus-within/rail:translate-x-0 group-focus-within/rail:opacity-100">
            Settings
          </span>
        </Link>
        {footer}
      </div>
    </aside>
  );
}
