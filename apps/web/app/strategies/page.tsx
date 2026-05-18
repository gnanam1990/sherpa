import Link from 'next/link';
import { GLASS_AURORA_ENABLED } from '../../lib/feature-flags';
import { StrategyMarketplacePanel } from '../_components/AdvancedPanels';
import { GlassAutomationShell } from '../_components/glass/automation-shell';

/**
 * /strategies — composed strategy templates. The proven
 * StrategyMarketplacePanel (real /api/strategies, follow without
 * enabling execution — its AdvancedPanels test contract) is preserved
 * verbatim; GLASS_AURORA_ENABLED only changes the shell around it.
 */
export const dynamic = 'force-dynamic';

export default function StrategiesPage() {
  if (GLASS_AURORA_ENABLED) {
    return (
      <GlassAutomationShell>
        <StrategyMarketplacePanel />
      </GlassAutomationShell>
    );
  }
  return (
    <main className="min-h-[100dvh] bg-sherpa-bg px-4 py-8 text-sherpa-fg sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link className="text-sm text-sherpa-muted transition hover:text-sherpa-fg" href="/">
          Back to Sherpa
        </Link>
        <div className="mt-6">
          <StrategyMarketplacePanel />
        </div>
      </div>
    </main>
  );
}
