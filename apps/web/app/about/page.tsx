/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Github, MessageCircle, Sparkles, Wallet, Zap, Languages } from '../_components/icons';
import { GLASS_AURORA_ENABLED } from '../../lib/feature-flags';
import { GlassAbout } from '../_components/glass/glass-about';

export const metadata: Metadata = {
  title: 'About · Sherpa',
  description:
    'Sherpa is a natural-language agent for Base. Type what you want, sign once, ship it.',
};

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

const faqs = [
  {
    q: "What's a Smart Wallet?",
    a: "A Smart Wallet is an ERC-4337 account: code, not a private key. Coinbase Smart Wallet uses your device passkey for signing, so there's no seed phrase to lose and no extension to install. It also unlocks batched transactions and sponsored gas — both of which Sherpa uses by default.",
  },
  {
    q: 'Is this safe?',
    a: "Sherpa runs public actions on Base mainnet with explicit confirmation cards and guarded amount caps. Every transaction shows the exact calls before you sign. The source is open at github.com/gnanam1990/sherpa.",
  },
  {
    q: 'What networks do you support?',
    a: 'Base mainnet is the public production network. Other L2s are available as read-only surfaces until their write adapters are audited.',
  },
  {
    q: 'When does mainnet ship?',
    a: 'Base mainnet is live now. New write surfaces still roll out behind explicit confirmation, amount caps, and adapter-specific safety checks.',
  },
  {
    q: 'How does Sherpa make money?',
    a: 'Stage 1 is free — we eat the gas to learn what intents people actually type. Stage 2 introduces a small protocol fee on sends/swaps; identity lookups stay free. No subscription, no token, no airdrop bait.',
  },
  {
    q: 'Is Sherpa open source?',
    a: 'Yes — MIT-licensed, monorepo at github.com/gnanam1990/sherpa. The agent loop, intent catalog, and confirmation card are all in the open. PRs welcome.',
  },
  {
    q: 'Where do I report a bug?',
    a: 'Open an issue at github.com/gnanam1990/sherpa/issues, or ping us on Farcaster. Browser errors are currently logged locally while Sentry browser wiring is being finalized.',
  },
];

function LegacyAbout() {
  return (
    <main
      id="main-content"
      className="min-h-[100dvh] bg-sherpa-bg px-4 py-8 text-sherpa-fg sm:px-6 sm:py-12"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-16">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold tracking-[-0.02em] text-base-blue-light"
            aria-label="Sherpa home"
          >
            <img src="/sherpa-icon-192.svg" alt="" className="h-6 w-6 rounded-md" />
            Sherpa
          </Link>
          <Link
            href="/"
            className="rounded-full border border-sherpa-surface2 bg-sherpa-surface px-4 py-2 text-sm text-sherpa-fg transition hover:border-sherpa-blue/70"
          >
            Open app
          </Link>
        </header>

        <section className="flex flex-col items-center gap-5 pt-4 text-center sm:pt-8">
          <h1 className="m-0 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-6xl">
            Type anything.
            <br />
            <span className="text-sherpa-blue">Sherpa does it.</span> On Base.
          </h1>
          <p className="max-w-xl text-base text-sherpa-muted sm:text-lg">
            A natural-language agent for Base. Plain English in, signed onchain action out. Passkey
            wallet, sponsored gas, no extension.
          </p>
          <Link
            href="/"
            className="mt-2 inline-flex min-h-11 items-center justify-center rounded-full bg-sherpa-blue px-7 py-3 text-base font-medium text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500"
          >
            Try it now
          </Link>
        </section>

        <section aria-labelledby="features-heading" className="flex flex-col gap-6">
          <h2
            id="features-heading"
            className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl"
          >
            What it does
          </h2>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, body }) => (
              <li
                key={title}
                className="flex flex-col gap-3 rounded-2xl border border-sherpa-surface2 bg-sherpa-surface p-5"
              >
                <Icon className="h-6 w-6 text-sherpa-blue" aria-hidden="true" />
                <h3 className="m-0 text-base font-semibold text-sherpa-fg">{title}</h3>
                <p className="m-0 text-sm leading-relaxed text-sherpa-muted">{body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="how-heading" className="flex flex-col gap-6">
          <h2 id="how-heading" className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
            How it works
          </h2>
          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {steps.map(({ n, title, body }) => (
              <li
                key={n}
                className="flex flex-col gap-3 rounded-2xl border border-sherpa-surface2 bg-sherpa-surface p-5"
              >
                <span className="font-mono text-xs tracking-wider text-sherpa-muted">{n}</span>
                <h3 className="m-0 text-base font-semibold text-sherpa-fg">{title}</h3>
                <p className="m-0 text-sm leading-relaxed text-sherpa-muted">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="faq-heading" className="flex flex-col gap-6">
          <h2 id="faq-heading" className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
            Questions
          </h2>
          <ul className="flex flex-col gap-3">
            {faqs.map(({ q, a }) => (
              <li
                key={q}
                className="rounded-2xl border border-sherpa-surface2 bg-sherpa-surface p-5"
              >
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-sherpa-fg">
                    {q}
                    <span
                      aria-hidden="true"
                      className="text-sherpa-muted transition group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-sherpa-muted">{a}</p>
                </details>
              </li>
            ))}
          </ul>
        </section>

        <footer className="flex flex-col items-center gap-4 border-t border-sherpa-surface2 pt-8 pb-4 text-sm text-sherpa-muted sm:flex-row sm:justify-between">
          <span>Base mainnet</span>
          <nav aria-label="Social" className="flex items-center gap-5">
            <a
              href="https://github.com/gnanam1990/sherpa"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 transition hover:text-sherpa-fg"
              aria-label="Sherpa on GitHub"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              GitHub
            </a>
            <a
              href="https://farcaster.xyz/sherpaonbase"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 transition hover:text-sherpa-fg"
              aria-label="Sherpa on Farcaster"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Farcaster
            </a>
            <a
              href="https://x.com/sherpaonbase"
              target="_blank"
              rel="noreferrer noopener"
              className="transition hover:text-sherpa-fg"
              aria-label="Sherpa on X"
            >
              X
            </a>
          </nav>
        </footer>
      </div>
    </main>
  );
}

/**
 * /about — static marketing/credibility page. Behind GLASS_AURORA_ENABLED:
 * the Glass redesign (adds the project credibility block) vs the unchanged
 * legacy page. about/page.test.tsx runs with the flag unset, so it
 * exercises (and pins) the legacy branch — kept byte-identical here.
 */
export default function AboutPage() {
  return GLASS_AURORA_ENABLED ? <GlassAbout /> : <LegacyAbout />;
}
