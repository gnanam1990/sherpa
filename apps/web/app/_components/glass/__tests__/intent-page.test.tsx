import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const wallet = vi.hoisted(() => ({
  address: undefined as `0x${string}` | undefined,
  isConnected: false,
}));

vi.mock('next/navigation', () => ({ usePathname: () => '/swap' }));
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('wagmi', () => ({
  useAccount: () => ({
    address: wallet.address,
    isConnected: wallet.isConnected,
  }),
  useBalance: () => ({ data: undefined }),
  useChainId: () => 8453,
  useEnsName: () => ({ data: null }),
}));
vi.mock('@sherpa/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sherpa/ui')>();
  return { ...actual, ConnectButton: () => <button>Connect Wallet</button> };
});

import { GlassIntentPage } from '../intent-page';

const SWAP = {
  feature: 'swap' as const,
  title: 'Swap',
  subtitle: 'Build a token swap through the verified SherpaRouter.',
  prompt: 'swap 1 usdc for eth',
  guardrails: ['Allowlisted tokens only: USDC, WETH, and DAI.'],
};

afterEach(() => vi.restoreAllMocks());

describe('GlassIntentPage (shared by swap/lend/borrow/repay/withdraw)', () => {
  it('renders the Glass shell, intent content and guardrails', () => {
    render(<GlassIntentPage {...SWAP} />);
    expect(screen.getByText('sherpa')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Swap' })).toBeTruthy();
    expect(screen.getAllByText('swap 1 usdc for eth').length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getByText('Allowlisted tokens only: USDC, WETH, and DAI.'),
    ).toBeTruthy();
    // Real Stage2ComingSoon block is preserved (mainnet status).
    expect(
      screen.getByText(
        /live on Base mainnet through the verified SherpaRouter/i,
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Compose in chat' }).getAttribute('href'),
    ).toBe('/');
    // Disconnected → Connect button, never a fake address.
    expect(screen.getByText('Connect Wallet')).toBeTruthy();
  });

  it('reflects per-route props (lend)', () => {
    render(
      <GlassIntentPage
        feature="lend"
        title="Lend"
        subtitle="Supply assets to Aave V3."
        prompt="lend 10 usdc to aave"
        guardrails={['Aave assets are allowlisted before any router call.']}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Lend' })).toBeTruthy();
    expect(
      screen.getAllByText('lend 10 usdc to aave').length,
    ).toBeGreaterThan(0);
  });
});
