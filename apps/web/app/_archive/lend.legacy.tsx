/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

/* Legacy /lend page — preserved for Phase 4 Glass Aurora
   migration rollback. Safe to delete after Phase 5 verification. */

import { AppShell } from '../_components/app-shell';
import { IntentPageFrame } from '../_components/intent-page-frame';

export default function LendPage() {
  return (
    <AppShell>
      <IntentPageFrame
        feature="lend"
        title="Lend"
        subtitle="Supply assets to Aave V3 from the Sherpa chat flow."
        prompt="lend 10 usdc to aave"
        guardrails={[
          'Aave assets are allowlisted before any router call.',
          'Approvals are explicit and visible in the wallet prompt.',
          'Treasury fees stay capped at 10 bps.',
        ]}
      />
    </AppShell>
  );
}
