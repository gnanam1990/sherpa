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
