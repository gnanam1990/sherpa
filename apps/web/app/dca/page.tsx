import { AppShell } from '../_components/app-shell';
import { DCAPanel } from '../_components/AutomationPanels';

export default function DCAPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <DCAPanel />
      </div>
    </AppShell>
  );
}
