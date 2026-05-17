import Link from 'next/link';
import { GovernancePanel } from '../_components/AutomationPanels';

export default function GovernancePage() {
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
