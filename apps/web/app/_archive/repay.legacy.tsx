/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

/* Legacy /repay page — preserved for Phase 4 Glass Aurora
   migration rollback. Safe to delete after Phase 5 verification. */

import { AppShell } from '../_components/app-shell';
import { IntentPageFrame } from '../_components/intent-page-frame';

export default function RepayPage() {
  return (
    <AppShell>
      <IntentPageFrame
        feature="repay"
        title="Repay"
        subtitle="Pay down Aave V3 debt through the same explicit review flow."
        prompt="repay 5 usdc"
        guardrails={[
          'Repay amounts are bounded by current debt.',
          'Excess repayment is refunded by the router.',
          'Every transaction goes through the confirmation card first.',
        ]}
      />
    </AppShell>
  );
}
