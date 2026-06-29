/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { GLASS_AURORA_ENABLED } from '../../lib/feature-flags';
import { AppShell } from '../_components/app-shell';
import { AlertsPanel } from '../_components/AutomationPanels';
import { GlassAutomationShell } from '../_components/glass/automation-shell';

/**
 * /alerts — price/balance/HF alert rules. The proven AlertsPanel (real
 * /api/alerts, browser-push + Farcaster + telegram/email channels, the
 * 6-test behaviour contract) is preserved verbatim; GLASS_AURORA_ENABLED
 * only changes the shell around it.
 */
export const dynamic = 'force-dynamic';

export default function AlertsPage() {
  if (GLASS_AURORA_ENABLED) {
    return (
      <GlassAutomationShell>
        <AlertsPanel />
      </GlassAutomationShell>
    );
  }
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <AlertsPanel />
      </div>
    </AppShell>
  );
}
