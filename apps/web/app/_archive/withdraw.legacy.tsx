/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

/* Legacy /withdraw page — preserved for Phase 4 Glass Aurora
   migration rollback. Safe to delete after Phase 5 verification. */

import { AppShell } from '../_components/app-shell';
import { IntentPageFrame } from '../_components/intent-page-frame';

export default function WithdrawPage() {
  return (
    <AppShell>
      <IntentPageFrame
        feature="withdraw"
        title="Withdraw"
        subtitle="Withdraw supplied collateral while preserving liquidation safety."
        prompt="withdraw 5 usdc from aave"
        guardrails={[
          'Withdraw is blocked when projected health factor would be unsafe.',
          'aToken handling was covered by the external review remediation.',
          'Start with tiny amounts until production traffic is proven.',
        ]}
      />
    </AppShell>
  );
}
