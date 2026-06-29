/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

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
    `${info.title} - Connect wallet to continue`,
    info.description,
    'Status: Base mainnet contracts are deployed and verified. Connect a wallet on Base to build a mainnet confirmation card.',
    'View mainnet router: https://basescan.org/address/0x00bfef87DD352D48F8572BcfA52E57870B35DE8b',
  ].join('\n') + parsed;
}

export function Stage2ComingSoon({
  feature,
  parsedIntent,
  mainnetEnabled = false,
}: {
  feature: Stage2Feature;
  parsedIntent?: unknown;
  mainnetEnabled?: boolean;
}) {
  const info = FEATURE_INFO[feature];
  const executable = mainnetEnabled;
  const contractHref = 'https://basescan.org/address/0x00bfef87DD352D48F8572BcfA52E57870B35DE8b';
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
            {mainnetEnabled ? 'Mainnet live' : 'Connect wallet'}
          </p>
          <h2
            className={`mt-1 text-2xl font-semibold tracking-[-0.03em] ${
              executable ? 'text-blue-100' : 'text-yellow-100'
            }`}
          >
            {mainnetEnabled ? `${info.title} is live on Base` : `${info.title} needs a connected wallet`}
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
          {mainnetEnabled ? 'Base mainnet' : 'Base mainnet ready'}
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
        {mainnetEnabled ? (
          <>
            <p>
              This action is live on Base mainnet through the verified SherpaRouter.
              Start with tiny amounts and review every wallet prompt before signing.
            </p>
            <p>
              Open the chat and try: <span className="font-mono text-sherpa-fg">{info.command}</span>
            </p>
          </>
        ) : (
          <p>
            SherpaRouter and SherpaTreasury are verified on Base mainnet. Connect a wallet
            to build a mainnet confirmation card from the chat.
          </p>
        )}
        <p>
          {mainnetEnabled
            ? 'Mainnet warning: use small amounts first.'
            : 'Try after connecting:'}{' '}
          <span className="font-mono text-sherpa-fg">{info.command}</span>
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3 text-sm">
        <a
          className="rounded-full border border-sherpa-blue/40 px-3 py-1 text-sherpa-blue transition hover:border-sherpa-blue"
          href={contractHref}
          rel="noopener noreferrer"
          target="_blank"
        >
          Mainnet contracts
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
