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
import { TelegramPanel } from '../_components/AutomationPanels';
import { GlassAutomationShell } from '../_components/glass/automation-shell';

/**
 * /telegram — bot setup info. TelegramPanel is purely informational
 * (static content, real bot/Mini App/Farcaster links, honest "signing
 * still happens through the web app" copy) so it stays static — no
 * force-dynamic. GLASS_AURORA_ENABLED only changes the shell.
 */
export default function TelegramPage() {
  if (GLASS_AURORA_ENABLED) {
    return (
      <GlassAutomationShell>
        <TelegramPanel />
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
          <TelegramPanel />
        </div>
      </div>
    </main>
  );
}
