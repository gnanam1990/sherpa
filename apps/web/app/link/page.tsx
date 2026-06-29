/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { Suspense } from 'react';
import { GLASS_AURORA_ENABLED } from '../../lib/feature-flags';
import { GlassCenterShell } from '../_components/glass/glass-center-shell';
import { LinkFlow } from './LinkFlow';

/**
 * /link — wallet to Telegram/Farcaster linking. The proven LinkFlow
 * (real useSearchParams + wagmi sign + the surface link API) is
 * preserved verbatim; GLASS_AURORA_ENABLED only changes the shell.
 * force-dynamic: reads URL params and wallet state.
 */
export const dynamic = 'force-dynamic';

export default function LinkPage() {
  if (GLASS_AURORA_ENABLED) {
    return (
      <GlassCenterShell>
        <Suspense fallback={<div className="opacity-60">Loading…</div>}>
          <LinkFlow />
        </Suspense>
      </GlassCenterShell>
    );
  }
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-slate-400">Loading...</div>}>
        <LinkFlow />
      </Suspense>
    </main>
  );
}
