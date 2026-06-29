/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

/* Legacy /borrow page — preserved for Phase 4 Glass Aurora
   migration rollback. Safe to delete after Phase 5 verification. */

import { AppShell } from '../_components/app-shell';
import { IntentPageFrame } from '../_components/intent-page-frame';

export default function BorrowPage() {
  return (
    <AppShell>
      <IntentPageFrame
        feature="borrow"
        title="Borrow"
        subtitle="Borrow against Aave collateral with health-factor checks."
        prompt="borrow 5 usdc"
        guardrails={[
          'Borrow is blocked if projected health factor is below the router threshold.',
          'The mainnet router enforces a 1.5 minimum health factor.',
          'Only verified Aave V3 assets are accepted.',
        ]}
      />
    </AppShell>
  );
}
