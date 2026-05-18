/* Legacy /swap page — preserved for Phase 4 Glass Aurora
   migration rollback. Safe to delete after Phase 5 verification. */

import { AppShell } from '../_components/app-shell';
import { IntentPageFrame } from '../_components/intent-page-frame';

export default function SwapPage() {
  return (
    <AppShell>
      <IntentPageFrame
        feature="swap"
        title="Swap"
        subtitle="Build a token swap through the verified SherpaRouter on Base mainnet."
        prompt="swap 1 usdc for eth"
        guardrails={[
          'Allowlisted tokens only: USDC, WETH, and DAI.',
          'Slippage and route endpoints are validated before execution.',
          'Use small amounts first and review every wallet prompt.',
        ]}
      />
    </AppShell>
  );
}
