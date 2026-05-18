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
