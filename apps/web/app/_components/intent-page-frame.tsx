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
import { Stage2ComingSoon, type Stage2Feature } from './Stage2ComingSoon';

type IntentPageFrameProps = {
  feature: Stage2Feature;
  title: string;
  subtitle: string;
  prompt: string;
  guardrails: string[];
};

export function IntentPageFrame({
  feature,
  title,
  subtitle,
  prompt,
  guardrails,
}: IntentPageFrameProps) {
  return (
    <div className="mx-auto grid max-w-5xl gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="space-y-5">
        <div className="base-card-soft p-5 sm:p-6">
          <div className="meta-label mb-2">Intent workspace</div>
          <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{subtitle}</p>
          <div className="mt-5 rounded-xl border border-border bg-muted p-4">
            <div className="mb-1 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Suggested prompt
            </div>
            <div className="font-mono text-sm text-foreground">{prompt}</div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link className="base-btn text-sm" href="/">
              Compose in chat
            </Link>
            <a
              className="base-btn-ghost text-sm"
              href="https://basescan.org/address/0x00bfef87DD352D48F8572BcfA52E57870B35DE8b"
              rel="noopener noreferrer"
              target="_blank"
            >
              Mainnet router
            </a>
          </div>
        </div>

        <Stage2ComingSoon feature={feature} mainnetEnabled />
      </section>

      <aside className="base-card-soft h-fit p-5">
        <div className="meta-label mb-3">Guardrails</div>
        <ul className="space-y-3">
          {guardrails.map((guardrail) => (
            <li className="flex gap-3 text-sm text-muted-foreground" key={guardrail}>
              <span
                className="mt-1 h-2 w-2 shrink-0 rounded-full bg-base-green shadow-[0_0_8px_rgba(0,211,149,0.65)]"
                aria-hidden="true"
              />
              <span>{guardrail}</span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
