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

const REPAY = {
  feature: 'repay' as const,
  title: 'Repay',
  subtitle: 'Pay down Aave V3 debt through the same explicit review flow.',
  prompt: 'repay 5 usdc',
  guardrails: [
    'Repay amounts are bounded by current debt.',
    'Excess repayment is refunded by the router.',
    'Every transaction goes through the confirmation card first.',
  ],
};

export default function RepayPage() {
  if (GLASS_AURORA_ENABLED) return <GlassIntentPage {...REPAY} />;
  return (
    <AppShell>
      <IntentPageFrame {...REPAY} />
    </AppShell>
  );
}
