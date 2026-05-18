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
