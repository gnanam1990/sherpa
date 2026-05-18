import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const wallet = vi.hoisted(() => ({
  address: undefined as `0x${string}` | undefined,
  isConnected: false,
}));

vi.mock('next/navigation', () => ({ usePathname: () => '/dca' }));
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

import { GlassAutomationShell } from '../automation-shell';

afterEach(() => vi.restoreAllMocks());

describe('GlassAutomationShell', () => {
  it('wraps the proven panel in the Glass shell + top bar', () => {
    render(
      <GlassAutomationShell>
        <div data-testid="panel">DCA scheduler</div>
      </GlassAutomationShell>,
    );
    expect(screen.getByText('sherpa')).toBeTruthy();
    expect(screen.getByTestId('panel')).toBeTruthy();
    // Disconnected → Connect button, never a fake address.
    expect(screen.getByText('Connect Wallet')).toBeTruthy();
  });
});
