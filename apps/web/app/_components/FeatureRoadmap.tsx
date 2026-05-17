import Link from 'next/link';

type FeatureStatus = 'live' | 'read-only' | 'testnet' | 'beta' | 'setup';

const FEATURES: Array<{
  name: string;
  status: FeatureStatus;
  description: string;
  href?: string;
}> = [
  {
    name: 'Send tokens',
    status: 'live',
    description: 'Send USDC on Base Sepolia with sponsored gas.',
  },
  {
    name: 'Aave positions',
    status: 'read-only',
    description: 'View health factor, collateral, and debt on Base mainnet.',
    href: '/positions',
  },
  {
    name: 'Swap',
    status: 'testnet',
    description: 'Testnet-only swap demo on Base Sepolia.',
    href: '/swap',
  },
  {
    name: 'Lend / Withdraw',
    status: 'testnet',
    description: 'Supply to Aave V3 on Base Sepolia. Withdraw remains audit pending.',
    href: '/lend',
  },
  {
    name: 'Borrow / Repay',
    status: 'testnet',
    description: 'Borrow against Base Sepolia Aave collateral. Repay remains audit pending.',
    href: '/borrow',
  },
  {
    name: 'Alerts',
    status: 'beta',
    description: 'Create price, balance, and health-factor rules.',
    href: '/alerts',
  },
  {
    name: 'DCA scheduler',
    status: 'beta',
    description: 'Create and manage recurring buy schedules.',
    href: '/dca',
  },
  {
    name: 'Auto-repay',
    status: 'beta',
    description: 'Configure protected rules. Execution stays audit-gated.',
    href: '/auto-repay',
  },
  {
    name: 'Telegram bot',
    status: 'setup',
    description: 'Bot service is built. Needs TELEGRAM_BOT_TOKEN to deploy.',
    href: '/telegram',
  },
  {
    name: 'Multi-chain',
    status: 'read-only',
    description: 'Inspect supported chains, explorers, DEXs, and bridges.',
    href: '/multi-chain',
  },
  {
    name: 'Governance',
    status: 'read-only',
    description: 'Browse proposals across Snapshot, Aave, Compound, and OP.',
    href: '/governance',
  },
];

const STATUS_CONFIG: Record<FeatureStatus, { label: string; classes: string }> = {
  live: {
    label: 'Live',
    classes: 'border-sherpa-success/30 bg-sherpa-success/10 text-sherpa-success',
  },
  'read-only': {
    label: 'Read-only live',
    classes: 'border-sherpa-blue/30 bg-sherpa-blue/10 text-sherpa-blue',
  },
  testnet: {
    label: 'Testnet live',
    classes: 'border-blue-400/30 bg-blue-400/10 text-blue-300',
  },
  beta: {
    label: 'Beta live',
    classes: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  },
  setup: {
    label: 'Setup needed',
    classes: 'border-violet-400/30 bg-violet-400/10 text-violet-300',
  },
};

export function FeatureRoadmap() {
  return (
    <section className="w-full max-w-3xl border-t border-sherpa-surface2 py-8">
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-[-0.02em]">What Sherpa can do</h2>
        <p className="mt-1 text-sm text-sherpa-muted">
          Stage 1 is live. Stage 2 writes are testnet-only; automation is beta-managed until audit.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {FEATURES.map((feature) => {
          const status = STATUS_CONFIG[feature.status];
          const content = (
            <div className="h-full rounded-lg border border-sherpa-surface2 bg-sherpa-surface p-3 transition hover:border-sherpa-muted">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{feature.name}</span>
                <span className={`rounded-full border px-2 py-0.5 text-xs ${status.classes}`}>
                  {status.label}
                </span>
              </div>
              <p className="text-xs leading-5 text-sherpa-muted">{feature.description}</p>
            </div>
          );

          return feature.href ? (
            <Link href={feature.href} key={feature.name}>
              {content}
            </Link>
          ) : (
            <div key={feature.name}>{content}</div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-sherpa-muted">
        <a
          className="underline-offset-4 transition hover:text-sherpa-fg hover:underline"
          href="https://github.com/gnanam1990/sherpa"
          rel="noopener noreferrer"
          target="_blank"
        >
          Source
        </a>
        <span aria-hidden="true">/</span>
        <a
          className="underline-offset-4 transition hover:text-sherpa-fg hover:underline"
          href="https://sepolia.basescan.org/address/0xDfe689ec2f0Ae3635C372DfaB7b6581bBb7c4032"
          rel="noopener noreferrer"
          target="_blank"
        >
          Sepolia contracts
        </a>
      </div>
    </section>
  );
}
