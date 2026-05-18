import { Suspense } from 'react';
import { GLASS_AURORA_ENABLED } from '../../lib/feature-flags';
import { GlassCenterShell } from '../_components/glass/glass-center-shell';
import { SignFlow } from './SignFlow';

/**
 * /sign — deep-link transaction signing (from Telegram/Farcaster). The
 * proven SignFlow (real token fetch + wagmi sponsored send, its
 * SignFlow.test.tsx contract) is preserved verbatim; GLASS_AURORA_ENABLED
 * only changes the shell. force-dynamic: reads URL token + wallet state.
 */
export const dynamic = 'force-dynamic';

export default function SignPage() {
  if (GLASS_AURORA_ENABLED) {
    return (
      <GlassCenterShell>
        <Suspense fallback={<div className="opacity-60">Loading…</div>}>
          <SignFlow />
        </Suspense>
      </GlassCenterShell>
    );
  }
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-slate-400">Loading...</div>}>
        <SignFlow />
      </Suspense>
    </main>
  );
}
