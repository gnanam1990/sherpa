'use client';

import Link from 'next/link';
import { Stage2ComingSoon, type Stage2Feature } from '../Stage2ComingSoon';
import { AppFrame } from './app-frame';
import { TopBar } from './top-bar';
import { useGlassTopBar } from './top-bar-data';
import { GlassPanel, MetaLabel } from './primitives';

/**
 * Glass Aurora intent workspace.
 *
 * Shared by every Stage-2 intent route (swap / lend / borrow / repay /
 * withdraw) — those routes are informational surfaces that point the user
 * at the chat flow, so one Glass component restyles them all (one source
 * of truth). The real, tested {@link Stage2ComingSoon} block is embedded
 * unchanged so its accurate mainnet status is preserved.
 */
export interface GlassIntentPageProps {
  feature: Stage2Feature;
  title: string;
  subtitle: string;
  prompt: string;
  guardrails: string[];
}

export function GlassIntentPage({
  feature,
  title,
  subtitle,
  prompt,
  guardrails,
}: GlassIntentPageProps) {
  const top = useGlassTopBar();
  return (
    <AppFrame>
      <TopBar
        account={top.account}
        chain={top.chain}
        live={top.live}
        right={top.right}
      />
      <div className="relative flex-1 overflow-y-auto px-4 py-6 sm:px-7">
        <div className="mx-auto grid w-full max-w-5xl gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-5">
            <GlassPanel className="p-5 sm:p-6">
              <MetaLabel>Intent workspace</MetaLabel>
              <h2 className="mt-2 font-serif text-3xl italic">{title}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 opacity-65">
                {subtitle}
              </p>
              <div className="glass-thin mt-5 rounded-2xl p-4">
                <MetaLabel>Suggested prompt</MetaLabel>
                <div className="mt-1 font-mono text-sm">{prompt}</div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href="/"
                  className="gradient-cerulean cerulean-glow-fx rounded-full px-4 py-2 text-sm font-semibold text-[#06081A]"
                >
                  Compose in chat
                </Link>
                <a
                  href="https://basescan.org/address/0x00bfef87DD352D48F8572BcfA52E57870B35DE8b"
                  rel="noopener noreferrer"
                  target="_blank"
                  className="glass-thin rounded-full px-4 py-2 text-sm"
                >
                  Mainnet router
                </a>
              </div>
            </GlassPanel>

            <GlassPanel className="p-5 sm:p-6">
              <Stage2ComingSoon feature={feature} mainnetEnabled />
            </GlassPanel>
          </section>

          <aside>
            <GlassPanel className="h-fit p-5">
              <MetaLabel>Guardrails</MetaLabel>
              <ul className="mt-3 space-y-3">
                {guardrails.map((guardrail) => (
                  <li
                    className="flex gap-3 text-sm opacity-70"
                    key={guardrail}
                  >
                    <span
                      className="mt-1 h-2 w-2 shrink-0 rounded-full bg-base-green shadow-glow-cerulean-sm"
                      aria-hidden="true"
                    />
                    <span>{guardrail}</span>
                  </li>
                ))}
              </ul>
            </GlassPanel>
          </aside>
        </div>
      </div>
    </AppFrame>
  );
}
