/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { AuroraBackground } from './background/aurora-background';

/**
 * Glass Aurora route-transition skeleton.
 *
 * This mirrors the persistent Glass chrome closely enough that Next route
 * loading never flashes back to the legacy dark shell while the dogfood flag
 * is enabled. It is decorative and data-free: no fake route, wallet, or
 * balance state is invented during loading.
 */
export function GlassLoadingSkeleton() {
  return (
    <main
      id="main-content"
      aria-busy="true"
      aria-label="Loading"
      className="relative flex h-[100dvh] min-h-[100dvh] overflow-hidden text-[#F8FAFF]"
    >
      <AuroraBackground />
      <aside
        aria-hidden="true"
        className="relative z-10 hidden w-[80px] shrink-0 border-r border-white/10 bg-[#050A13]/22 px-3 py-5 backdrop-blur-xl sm:block"
      >
        <div className="glass-thin h-12 rounded-2xl" />
        <div className="mx-auto my-4 h-px w-7 bg-white/15" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-12 rounded-2xl bg-white/[0.045]"
            />
          ))}
        </div>
      </aside>
      <section className="relative z-10 flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between px-7 pt-5">
          <div className="flex items-center gap-3">
            <span className="font-serif text-[30px] italic leading-none">
              sherpa
            </span>
            <span className="glass-thin h-6 w-24 rounded-full" />
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="glass-thin h-8 w-12 rounded-full" />
            <span className="glass-thin h-8 w-36 rounded-full" />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="glass-thin rounded-3xl px-6 py-4 text-center">
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#00E1FF]/80">
              Loading
            </div>
            <div className="mt-3 flex justify-center gap-1.5">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#00E1FF]" />
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#4D80FF] [animation-delay:120ms]" />
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#FF4DB8] [animation-delay:240ms]" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
