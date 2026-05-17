export type Stage2Feature = 'swap' | 'lend' | 'borrow' | 'repay' | 'withdraw';

const FEATURE_INFO: Record<
  Stage2Feature,
  { title: string; description: string; command: string }
> = {
  swap: {
    title: 'Swap',
    description: 'Swap tokens on Aerodrome with sponsored gas.',
    command: 'swap 1 usdc for eth',
  },
  lend: {
    title: 'Lend to Aave',
    description: 'Supply assets to Aave V3 for yield.',
    command: 'lend 100 usdc to aave',
  },
  borrow: {
    title: 'Borrow from Aave',
    description: 'Borrow against your supplied collateral.',
    command: 'borrow 50 usdc',
  },
  repay: {
    title: 'Repay Aave',
    description: 'Pay down Aave V3 debt.',
    command: 'repay 50 usdc',
  },
  withdraw: {
    title: 'Withdraw from Aave',
    description: 'Withdraw supplied assets from Aave V3.',
    command: 'withdraw 50 usdc from aave',
  },
};

export function stage2ComingSoonText(feature: Stage2Feature, parsedIntent?: unknown): string {
  const info = FEATURE_INFO[feature];
  const parsed = parsedIntent ? `\n\nI understood: ${JSON.stringify(parsedIntent)}` : '';
  return [
    `${info.title} - Coming soon`,
    info.description,
    'Status: contracts are deployed to Base Sepolia and pending external audit before mainnet launch.',
    'View Sepolia router: https://sepolia.basescan.org/address/0xDfe689ec2f0Ae3635C372DfaB7b6581bBb7c4032',
  ].join('\n') + parsed;
}

export function Stage2ComingSoon({
  feature,
  parsedIntent,
  testnetEnabled = false,
}: {
  feature: Stage2Feature;
  parsedIntent?: unknown;
  testnetEnabled?: boolean;
}) {
  const info = FEATURE_INFO[feature];
  const executable = testnetEnabled && ['swap', 'lend', 'borrow'].includes(feature);
  return (
    <section
      className={`rounded-lg border p-6 ${
        executable
          ? 'border-blue-400/30 bg-blue-400/10'
          : 'border-yellow-400/30 bg-yellow-400/10'
      }`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p
            className={`text-xs font-medium uppercase tracking-[0.14em] ${
              executable ? 'text-blue-300' : 'text-yellow-300'
            }`}
          >
            {executable ? 'Testnet enabled' : 'Audit pending'}
          </p>
          <h2
            className={`mt-1 text-2xl font-semibold tracking-[-0.03em] ${
              executable ? 'text-blue-100' : 'text-yellow-100'
            }`}
          >
            {executable ? `${info.title} is live on testnet` : `${info.title} is coming soon`}
          </h2>
          <p className={`mt-2 text-sm ${executable ? 'text-blue-100/80' : 'text-yellow-100/80'}`}>
            {info.description}
          </p>
        </div>
        <span
          className={`rounded-full border bg-black/20 px-3 py-1 text-xs ${
            executable
              ? 'border-blue-400/30 text-blue-200'
              : 'border-yellow-400/30 text-yellow-200'
          }`}
        >
          {executable ? 'Base Sepolia only' : 'Base Sepolia ready'}
        </span>
      </div>

      {parsedIntent ? (
        <div className="mb-4 rounded-lg border border-sherpa-surface2 bg-sherpa-bg p-3">
          <div className="mb-1 text-xs text-sherpa-muted">Sherpa understood your request</div>
          <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-sherpa-fg">
            {JSON.stringify(parsedIntent, null, 2)}
          </pre>
        </div>
      ) : null}

      <div className="space-y-2 text-sm text-sherpa-muted">
        {executable ? (
          <>
            <p>
              This action is enabled only on Base Sepolia with small demo amount caps.
              Mainnet execution stays disabled until external audit is complete.
            </p>
            <p>
              Open the chat and try: <span className="font-mono text-sherpa-fg">{info.command}</span>
            </p>
          </>
        ) : (
          <p>
            SherpaRouter and SherpaTreasury are verified on Base Sepolia for audit review.
            Mainnet execution stays disabled until external audit is complete.
          </p>
        )}
        <p>
          {executable ? 'Testnet warning: use faucet assets only.' : 'Try the command later:'}{' '}
          <span className="font-mono text-sherpa-fg">{info.command}</span>
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3 text-sm">
        <a
          className="rounded-full border border-sherpa-blue/40 px-3 py-1 text-sherpa-blue transition hover:border-sherpa-blue"
          href="https://sepolia.basescan.org/address/0xDfe689ec2f0Ae3635C372DfaB7b6581bBb7c4032"
          rel="noopener noreferrer"
          target="_blank"
        >
          Sepolia contracts
        </a>
        <a
          className="rounded-full border border-sherpa-surface2 px-3 py-1 text-sherpa-muted transition hover:border-sherpa-muted hover:text-sherpa-fg"
          href="https://github.com/gnanam1990/sherpa"
          rel="noopener noreferrer"
          target="_blank"
        >
          Source
        </a>
      </div>
    </section>
  );
}
