import Link from 'next/link';

type FeatureStatus = 'live' | 'read-only' | 'mainnet' | 'beta';

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
    status: 'mainnet',
    description: 'Swap on Base mainnet through verified SherpaRouter.',
    href: '/swap',
  },
  {
    name: 'Lend / Withdraw',
    status: 'mainnet',
    description: 'Supply to and withdraw from Aave V3 on Base mainnet.',
    href: '/lend',
  },
  {
    name: 'Borrow / Repay',
    status: 'mainnet',
    description: 'Borrow against and repay Aave V3 debt on Base mainnet.',
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
    status: 'live',
    description: 'Live on Railway: chat with @sherpaonbasebot; signing routes through web.',
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
    status: 'beta',
    description: 'Browse proposals and build explicit delegation transactions.',
    href: '/governance',
  },
  {
    name: 'Strategy marketplace',
    status: 'beta',
    description: 'Browse and follow reusable strategy templates.',
    href: '/strategies',
  },
  {
    name: 'Session keys',
    status: 'beta',
    description: 'Configure scoped permission policies for future automation.',
    href: '/session-keys',
  },
];

const STATUS_CONFIG: Record<FeatureStatus, { label: string; classes: string }> = {
  live: {
    label: 'Live',
    classes: 'border-base-green/30 bg-base-green/10 text-base-green',
  },
  'read-only': {
    label: 'Read-only live',
    classes: 'border-base-blue/30 bg-base-blue/10 text-base-blue',
  },
  mainnet: {
    label: 'Mainnet live',
    classes: 'border-base-blue-light/30 bg-base-blue-light/10 text-base-blue-light',
  },
  beta: {
    label: 'Beta live',
    classes: 'border-base-cerulean/30 bg-base-cerulean/10 text-base-cerulean',
  },
};

export function FeatureRoadmap() {
  return (
    <section className="w-full border-t border-border py-8">
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-[-0.02em]">What Sherpa can do</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Stage 1 send is live on Base Sepolia. Stage 2 swap and Aave actions are live on Base mainnet with guarded amount caps.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {FEATURES.map((feature) => {
          const status = STATUS_CONFIG[feature.status];
          const content = (
            <div className="h-full rounded-lg border border-border bg-card p-3 transition hover:border-base-blue/40">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{feature.name}</span>
                <span className={`rounded-full border px-2 py-0.5 text-xs ${status.classes}`}>
                  {status.label}
                </span>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">{feature.description}</p>
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

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
        <a
          className="underline-offset-4 transition hover:text-foreground hover:underline"
          href="https://github.com/gnanam1990/sherpa"
          rel="noopener noreferrer"
          target="_blank"
        >
          Source
        </a>
        <span aria-hidden="true">/</span>
        <a
          className="underline-offset-4 transition hover:text-foreground hover:underline"
          href="https://basescan.org/address/0x00bfef87DD352D48F8572BcfA52E57870B35DE8b"
          rel="noopener noreferrer"
          target="_blank"
        >
          Mainnet contracts
        </a>
      </div>
    </section>
  );
}
