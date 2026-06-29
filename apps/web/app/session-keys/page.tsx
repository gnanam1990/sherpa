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
import { SessionKeyPanel } from '../_components/AdvancedPanels';
import { GlassAutomationShell } from '../_components/glass/automation-shell';

/**
 * /session-keys — scoped session-key policy manager. The proven
 * SessionKeyPanel is preserved verbatim, including its honest blocker
 * copy ("Full on-chain session-key support depends on Coinbase Smart
 * Wallet's session key feature — track availability at
 * https://docs.base.org") and the "Sherpa did not generate or custody a
 * private key" guarantee. GLASS_AURORA_ENABLED only changes the shell.
 */
export const dynamic = 'force-dynamic';

export default function SessionKeysPage() {
  if (GLASS_AURORA_ENABLED) {
    return (
      <GlassAutomationShell>
        <SessionKeyPanel />
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
          <SessionKeyPanel />
        </div>
      </div>
    </main>
  );
}
