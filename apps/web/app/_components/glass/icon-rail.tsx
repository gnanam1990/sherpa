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
      className={`group/rail relative z-10 flex w-[80px] shrink-0 flex-col items-center gap-1.5 px-3 py-5 ${className}`}
      aria-label="Primary"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-5 left-[72px] top-5 z-30 w-60 -translate-x-2 opacity-0 transition duration-200 ease-out group-hover/rail:pointer-events-auto group-hover/rail:translate-x-0 group-hover/rail:opacity-100 group-focus-within/rail:pointer-events-auto group-focus-within/rail:translate-x-0 group-focus-within/rail:opacity-100"
      >
        <div className="glass-deep flex h-full flex-col overflow-hidden rounded-[28px] border border-white/12 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
          <div className="mb-3 flex h-12 items-center gap-3 rounded-2xl bg-white/[0.04] px-3">
            <Image
              src="/sherpa-icon-192.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-xl object-contain"
              priority
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">Sherpa</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                Navigation
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex flex-col gap-1.5">
              {list.map((r) => {
                const active = r.id === activeRoute;
                const badge = badges?.[r.id];
                return (
                  <div
                    key={r.id}
                    className={`flex h-12 items-center gap-3 rounded-2xl px-3 text-sm transition ${
                      active
                        ? 'bg-white/12 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]'
                        : 'text-white/68'
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${active ? 'bg-[#00E1FF]' : 'bg-white/18'}`}
                    />
                    <span className="min-w-0 flex-1 truncate font-medium">{r.label}</span>
                    {showStageTags && (
                      <span className="truncate font-mono text-[10px] text-white/38">
                        {r.group}
                      </span>
                    )}
                    {badge !== undefined && (
                      <span className="rounded-full bg-[#FF4DB8]/25 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-white">
                        {badge}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-auto flex h-11 items-center gap-3 rounded-2xl px-3 text-sm text-white/58">
            <span className="h-2 w-2 rounded-full bg-white/18" />
            <span className="font-medium">Settings</span>
          </div>
        </div>
      </div>

      <Link
        href="/"
        aria-label="Sherpa home"
        onClick={onNavigate}
        className="glass-thin relative z-40 mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ring-white/15"
      >
        <Image
          src="/sherpa-icon-192.png"
          alt=""
          width={34}
          height={34}
          className="h-[34px] w-[34px] rounded-xl object-contain"
          priority
        />
      </Link>
      <div className="my-1 h-px w-7 bg-white/15" aria-hidden="true" />

      <nav className="relative z-40 flex flex-col items-center gap-1.5" aria-label="Sections">
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
                {showStageTags && <span className="ml-1.5 opacity-60">{r.group}</span>}
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

      <div className="relative z-40 mt-auto flex flex-col items-center gap-2">
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
