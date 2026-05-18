/* Legacy /alerts page — preserved for Phase 4 Glass Aurora
   migration rollback. Safe to delete after Phase 5 verification. */

import { AppShell } from '../_components/app-shell';
import { AlertsPanel } from '../_components/AutomationPanels';

export default function AlertsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <AlertsPanel />
      </div>
    </AppShell>
  );
}
