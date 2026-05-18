import { GLASS_AURORA_ENABLED } from '../../lib/feature-flags';
import { AppShell } from '../_components/app-shell';
import { IntentPageFrame } from '../_components/intent-page-frame';
import { GlassIntentPage } from '../_components/glass/intent-page';

const WITHDRAW = {
  feature: 'withdraw' as const,
  title: 'Withdraw',
  subtitle:
    'Withdraw supplied collateral while preserving liquidation safety.',
  prompt: 'withdraw 5 usdc from aave',
  guardrails: [
    'Withdraw is blocked when projected health factor would be unsafe.',
    'aToken handling was covered by the external review remediation.',
    'Start with tiny amounts until production traffic is proven.',
  ],
};

export default function WithdrawPage() {
  if (GLASS_AURORA_ENABLED) return <GlassIntentPage {...WITHDRAW} />;
  return (
    <AppShell>
      <IntentPageFrame {...WITHDRAW} />
    </AppShell>
  );
}
