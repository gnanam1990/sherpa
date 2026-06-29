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
import { AuroraBackground } from './background/aurora-background';
import { GlassPanel } from './primitives';

/**
 * Glass Aurora centered shell.
 *
 * For deep-link landing surfaces (/link, /sign) that are entered from
 * Telegram/Farcaster/email and have a single focused task. No IconRail
 * (there is nowhere to navigate from a one-shot link) — just the aurora
 * background and a centered GlassPanel hosting the unchanged flow.
 */
export function GlassCenterShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden p-4 text-[#F8FAFF]">
      <AuroraBackground />
      <div className="relative z-10 w-full max-w-md">
        <GlassPanel deep className="p-6">
          {children}
        </GlassPanel>
      </div>
    </main>
  );
}
