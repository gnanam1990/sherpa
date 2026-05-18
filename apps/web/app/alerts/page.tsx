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
