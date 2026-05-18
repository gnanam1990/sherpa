import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const H = vi.hoisted(() => {
  const ADDRESS =
    '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`;
  return {
    ADDRESS,
    wallet: { address: ADDRESS as `0x${string}` | undefined, isConnected: true },
  };
});
const { ADDRESS } = H;

vi.mock('next/navigation', () => ({ usePathname: () => '/positions' }));
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
    address: H.wallet.address,
    isConnected: H.wallet.isConnected,
  }),
  useBalance: () => ({ data: { formatted: '0.25', symbol: 'ETH' } }),
  useChainId: () => 8453,
  useEnsName: () => ({ data: null }),
}));
vi.mock('@sherpa/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sherpa/ui')>();
  return { ...actual, ConnectButton: () => <button>Connect Wallet</button> };
});

import { GlassPositions } from '../glass-positions';

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

const POSITION = {
  address: ADDRESS,
  chain: 'base',
  pool: '0xPool',
  totalCollateralBase: '1234567890',
  totalDebtBase: '250000000',
  availableBorrowsBase: '500000000',
  currentLiquidationThreshold: '8250',
  ltv: '7800',
  healthFactor: '3300000000000000000',
  hasPosition: true,
  fetchedAt: '2026-05-16T00:00:00.000Z',
};

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  H.wallet = { address: ADDRESS, isConnected: true };
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('GlassPositions', () => {
  it('renders real Aave data in the Glass shell', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse(POSITION)));
    render(<GlassPositions />);
    await flush();

    expect(screen.getByText('sherpa')).toBeTruthy();
    expect(screen.getByText('Aave Positions')).toBeTruthy();
    expect(screen.getByText('$12.34')).toBeTruthy(); // collateral hero
    expect(screen.getByText('$2.50')).toBeTruthy(); // debt
    expect(screen.getByText(/HF 3.30 · Safe/)).toBeTruthy();
  });

  it('asks to connect when disconnected', async () => {
    H.wallet = { address: undefined, isConnected: false };
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse(POSITION)));
    render(<GlassPositions />);
    await flush();

    expect(
      screen.getByText('Connect your wallet to view Aave positions.'),
    ).toBeTruthy();
    expect(screen.getByText('Connect Wallet')).toBeTruthy();
  });

  it('shows an error with retry on API failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse({ error: 'x', details: 'rpc down' }, 500)),
    );
    render(<GlassPositions />);
    await flush();

    expect(await screen.findByText('Error: rpc down')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });
});
