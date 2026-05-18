/* Legacy /strategies page — preserved for Phase 4 Glass Aurora
   migration rollback. Safe to delete after Phase 5 verification. */

import Link from 'next/link';
import { StrategyMarketplacePanel } from '../_components/AdvancedPanels';

export default function StrategiesPage() {
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
