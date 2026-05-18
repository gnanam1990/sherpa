import { GLASS_AURORA_ENABLED } from '../../lib/feature-flags';
import { AppShell } from '../_components/app-shell';
import { IntentPageFrame } from '../_components/intent-page-frame';
import { GlassIntentPage } from '../_components/glass/intent-page';

const SWAP = {
  feature: 'swap' as const,
  title: 'Swap',
  subtitle:
    'Build a token swap through the verified SherpaRouter on Base mainnet.',
  prompt: 'swap 1 usdc for eth',
  guardrails: [
    'Allowlisted tokens only: USDC, WETH, and DAI.',
    'Slippage and route endpoints are validated before execution.',
    'Use small amounts first and review every wallet prompt.',
  ],
};

export default function SwapPage() {
  if (GLASS_AURORA_ENABLED) return <GlassIntentPage {...SWAP} />;
  return (
    <AppShell>
      <IntentPageFrame {...SWAP} />
    </AppShell>
  );
}
