import Link from 'next/link';
import { GLASS_AURORA_ENABLED } from '../../lib/feature-flags';
import { AutoRepayPanel } from '../_components/AutomationPanels';
import { GlassAutomationShell } from '../_components/glass/automation-shell';

/**
 * /auto-repay — liquidation-protection rule manager. The proven
 * AutoRepayPanel (real /api/auto-repay, honest "execution gated until
 * signer setup" message) is preserved verbatim; GLASS_AURORA_ENABLED
 * only changes the shell around it.
 */
export const dynamic = 'force-dynamic';

export default function AutoRepayPage() {
  if (GLASS_AURORA_ENABLED) {
    return (
      <GlassAutomationShell>
        <AutoRepayPanel />
      </GlassAutomationShell>
    );
  }
  return (
    <main className="min-h-[100dvh] bg-sherpa-bg px-4 py-8 text-sherpa-fg sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link className="text-sm text-sherpa-muted transition hover:text-sherpa-fg" href="/">
          Back to Sherpa
        </Link>
        <div className="mt-6">
          <AutoRepayPanel />
        </div>
      </div>
    </main>
  );
}
