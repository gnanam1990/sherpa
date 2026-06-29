/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { GLASS_AURORA_ENABLED } from '../../lib/feature-flags';
import { AppShell } from '../_components/app-shell';
import { IntentPageFrame } from '../_components/intent-page-frame';
import { GlassIntentPage } from '../_components/glass/intent-page';

const BORROW = {
  feature: 'borrow' as const,
  title: 'Borrow',
  subtitle: 'Borrow against Aave collateral with health-factor checks.',
  prompt: 'borrow 5 usdc',
  guardrails: [
    'Borrow is blocked if projected health factor is below the router threshold.',
    'The mainnet router enforces a 1.5 minimum health factor.',
    'Only verified Aave V3 assets are accepted.',
  ],
};

export default function BorrowPage() {
  if (GLASS_AURORA_ENABLED) return <GlassIntentPage {...BORROW} />;
  return (
    <AppShell>
      <IntentPageFrame {...BORROW} />
    </AppShell>
  );
}
