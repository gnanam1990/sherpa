import Link from 'next/link';

type FeatureStatus = 'live' | 'read-only' | 'testnet' | 'pending-audit' | 'coming';

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
    status: 'coming',
    description: 'Price, balance, and health-factor notifications.',
  },
  {
    name: 'DCA scheduler',
    status: 'coming',
    description: 'Recurring swaps with pause and failure controls.',
  },
  {
    name: 'Auto-repay',
    status: 'coming',
    description: 'Liquidation protection with explicit safety caps.',
  },
  {
    name: 'Telegram bot',
    status: 'coming',
    description: 'Use Sherpa from chat surfaces.',
  },
  {
    name: 'Multi-chain',
    status: 'coming',
    description: 'Polygon, Optimism, Arbitrum, and more.',
  },
  {
    name: 'Governance',
    status: 'coming',
    description: 'Vote and delegate across supported protocols.',
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
  'pending-audit': {
    label: 'Audit pending',
    classes: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-300',
  },
  coming: {
    label: 'Coming soon',
    classes: 'border-sherpa-surface2 bg-sherpa-surface text-sherpa-muted',
  },
};

export function FeatureRoadmap() {
  return (
    <section className="w-full max-w-3xl border-t border-sherpa-surface2 py-8">
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-[-0.02em]">What Sherpa can do</h2>
        <p className="mt-1 text-sm text-sherpa-muted">
          Stage 1 is live. Stage 2 write actions are testnet-only until audit.
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
