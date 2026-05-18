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
