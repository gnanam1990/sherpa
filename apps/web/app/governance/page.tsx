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
import { GLASS_AURORA_ENABLED } from '../../lib/feature-flags';
import { GovernancePanel } from '../_components/AutomationPanels';
import { GlassAutomationShell } from '../_components/glass/automation-shell';

/**
 * /governance — Snapshot proposal feed + delegation builder. The proven
 * GovernancePanel (real /api/governance Snapshot data, honest upstream
 * warning + empty states, GovernanceActionsPanel which builds delegation
 * tx data without ever auto-broadcasting) is preserved verbatim;
 * GLASS_AURORA_ENABLED only changes the shell around it.
 */
export const dynamic = 'force-dynamic';

export default function GovernancePage() {
  if (GLASS_AURORA_ENABLED) {
    return (
      <GlassAutomationShell>
        <GovernancePanel />
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
          <GovernancePanel />
        </div>
      </div>
    </main>
  );
}
