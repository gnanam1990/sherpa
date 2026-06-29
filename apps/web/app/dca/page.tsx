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
import { DCAPanel } from '../_components/AutomationPanels';
import { GlassAutomationShell } from '../_components/glass/automation-shell';

/**
 * /dca — recurring buy scheduler. The proven DCAPanel (real /api/dca
 * load + create, honest session-key gating) is preserved verbatim;
 * GLASS_AURORA_ENABLED only changes the shell around it.
 */
export const dynamic = 'force-dynamic';

export default function DCAPage() {
  if (GLASS_AURORA_ENABLED) {
    return (
      <GlassAutomationShell>
        <DCAPanel />
      </GlassAutomationShell>
    );
  }
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <DCAPanel />
      </div>
    </AppShell>
  );
}
