import { GLASS_AURORA_ENABLED } from '../../lib/feature-flags';
import { AppShell } from '../_components/app-shell';
import { IntentPageFrame } from '../_components/intent-page-frame';
import { GlassIntentPage } from '../_components/glass/intent-page';

const LEND = {
  feature: 'lend' as const,
  title: 'Lend',
  subtitle: 'Supply assets to Aave V3 from the Sherpa chat flow.',
  prompt: 'lend 10 usdc to aave',
  guardrails: [
    'Aave assets are allowlisted before any router call.',
    'Approvals are explicit and visible in the wallet prompt.',
    'Treasury fees stay capped at 10 bps.',
  ],
};

export default function LendPage() {
  if (GLASS_AURORA_ENABLED) return <GlassIntentPage {...LEND} />;
  return (
    <AppShell>
      <IntentPageFrame {...LEND} />
    </AppShell>
  );
}
