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
