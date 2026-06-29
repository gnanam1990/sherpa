/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import Link from 'next/link';
import {
  Github,
  MessageCircle,
  Sparkles,
  Wallet,
  Zap,
  Languages,
} from '../icons';
import { AuroraBackground } from './background/aurora-background';
import { GlassPanel, MetaLabel } from './primitives';

/**
 * Glass Aurora /about — static marketing/credibility surface.
 *
 * Server-renderable (no hooks → prerenders static). Same real content as
 * the legacy page plus the project credibility block. Honest, factual
 * project claims only. The legacy page is preserved for flag=0 (and is
 * what about/page.test.tsx exercises), so this is free to be a redesign.
 */

const features = [
  {
    icon: Languages,
    title: 'Natural language',
    body: 'Type "send 5 USDC to vitalik.base.eth" — no contract calls, no calldata, no manual approvals.',
  },
  {
    icon: Wallet,
    title: 'Smart Wallet',
    body: 'Coinbase Smart Wallet via passkey. No seed phrase. No browser extension. Works on mobile.',
  },
  {
    icon: Zap,
    title: 'Base mainnet',
    body: 'Sherpa builds Base mainnet actions with explicit wallet confirmation and guarded amount caps.',
  },
  {
    icon: Sparkles,
    title: '30+ intents',
    body: 'Sends, swaps, identity lookups, basenames, and more. The catalog grows every week.',
  },
];

const steps = [
  {
    n: '01',
    title: 'Connect',
    body: 'Tap Connect. A passkey provisions your Smart Wallet in seconds — no extension, no seed phrase to write down.',
  },
  {
    n: '02',
    title: 'Type',
    body: 'Write what you want in plain English. Sherpa parses intent, picks the right route, and shows you the call before it runs.',
  },
  {
    n: '03',
    title: 'Confirm',
    body: 'Review the confirmation card, then sign once with your wallet or passkey on Base mainnet.',
  },
];

const credentials = [
  ['Audits', '2 external rounds · 0 critical'],
  ['Router coverage', '96.94%'],
  ['Build', 'Solo built · open source · MIT'],
  ['Network', 'Base mainnet'],
];

export function GlassAbout() {
  return (
    <main
      id="main-content"
      className="relative min-h-[100dvh] overflow-hidden px-4 py-10 text-[#F8FAFF] sm:px-6"
    >
      <AuroraBackground />
      <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-12">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            aria-label="Sherpa home"
            className="font-serif text-2xl italic"
          >
            sherpa
          </Link>
          <Link
            href="/"
            className="glass-thin rounded-full px-4 py-2 text-sm"
          >
            Open app
          </Link>
        </header>

        <section className="flex flex-col items-center gap-5 pt-4 text-center">
          <h1
            className="m-0 max-w-3xl font-serif text-5xl italic leading-[1.05] sm:text-7xl"
          >
            <span className="text-gradient-ice">About Sherpa</span>
          </h1>
          <p className="max-w-xl text-base opacity-70 sm:text-lg">
            A natural-language agent for Base. Plain English in, signed
            onchain action out. Passkey wallet, sponsored gas, no extension.
          </p>
          <Link
            href="/"
            className="gradient-cerulean cerulean-glow-fx mt-2 inline-flex min-h-11 items-center justify-center rounded-full px-7 py-3 text-base font-semibold text-[#06081A]"
          >
            Try it now
          </Link>
        </section>

        <section className="grid gap-3 sm:grid-cols-4">
          {credentials.map(([k, v]) => (
            <GlassPanel key={k} className="p-4">
              <MetaLabel>{k}</MetaLabel>
              <div className="mt-1 text-sm font-semibold">{v}</div>
            </GlassPanel>
          ))}
        </section>

        <section aria-labelledby="g-features" className="flex flex-col gap-6">
          <h2 id="g-features" className="font-serif text-3xl italic">
            What it does
          </h2>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, body }) => (
              <li key={title}>
                <GlassPanel className="flex h-full flex-col gap-3 p-5">
                  <Icon className="h-6 w-6 text-base-cerulean" aria-hidden="true" />
                  <h3 className="m-0 text-base font-semibold">{title}</h3>
                  <p className="m-0 text-sm leading-relaxed opacity-65">
                    {body}
                  </p>
                </GlassPanel>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="g-how" className="flex flex-col gap-6">
          <h2 id="g-how" className="font-serif text-3xl italic">
            How it works
          </h2>
          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {steps.map(({ n, title, body }) => (
              <li key={n}>
                <GlassPanel className="flex h-full flex-col gap-3 p-5">
                  <span className="font-mono text-xs tracking-wider opacity-55">
                    {n}
                  </span>
                  <h3 className="m-0 text-base font-semibold">{title}</h3>
                  <p className="m-0 text-sm leading-relaxed opacity-65">
                    {body}
                  </p>
                </GlassPanel>
              </li>
            ))}
          </ol>
        </section>

        <footer className="flex flex-col items-center gap-4 border-t border-white/10 pt-8 pb-4 text-sm opacity-65 sm:flex-row sm:justify-between">
          <span>Base mainnet · MIT · open source</span>
          <nav aria-label="Social" className="flex items-center gap-5">
            <a
              href="https://github.com/gnanam1990/sherpa"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 transition hover:text-white"
              aria-label="Sherpa on GitHub"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              GitHub
            </a>
            <a
              href="https://github.com/gnanam1990/sherpa/tree/main/docs"
              target="_blank"
              rel="noreferrer noopener"
              className="transition hover:text-white"
              aria-label="Sherpa audit package"
            >
              Audit package
            </a>
            <a
              href="https://farcaster.xyz/sherpaonbase"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 transition hover:text-white"
              aria-label="Sherpa on Farcaster"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Farcaster
            </a>
          </nav>
        </footer>
      </div>
    </main>
  );
}
