import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BaseAppContent } from './BaseAppContent';

const wagmiState = vi.hoisted(() => ({
  address: undefined as `0x${string}` | undefined,
  isConnected: false,
  accountEffect: undefined as
    | undefined
    | { onConnect?: (data: { address: `0x${string}` }) => void; onDisconnect?: () => void },
}));

vi.mock('wagmi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wagmi')>();
  return {
    ...actual,
    useAccount: () => ({ address: wagmiState.address, isConnected: wagmiState.isConnected }),
    useAccountEffect: (params: typeof wagmiState.accountEffect) => {
      wagmiState.accountEffect = params;
    },
  };
});

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { custom: vi.fn() }),
}));

vi.mock('next/image', () => ({
  default: ({
    priority: _priority,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => <img {...props} />,
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('../../lib/wagmi', () => ({
  useSherpaCallsStatus: () => ({ data: undefined, error: null, isError: false }),
  useSherpaSendCalls: () => ({
    sendSponsoredCalls: vi.fn(),
    sendSponsoredCallsAsync: vi.fn(),
  }),
}));

vi.mock('@sherpa/ui', async () => {
  const actual = await vi.importActual<typeof import('@sherpa/ui')>('@sherpa/ui');
  return {
    ...actual,
    ConnectButton: ({ variant }: { variant?: 'compact' | 'hero' }) => (
      <button type="button">{variant === 'hero' ? 'Connect wallet' : 'Connect'}</button>
    ),
    ConfirmationCard: () => <div data-testid="confirmation-card" />,
  };
});

describe('BaseAppContent', () => {
  it('renders the Base App mobile surface and core links', () => {
    wagmiState.address = undefined;
    wagmiState.isConnected = false;

    render(<BaseAppContent />);

    expect(screen.getByText('Base App surface')).toBeInTheDocument();
    expect(screen.getByText('Plain English to Base')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Positions/ })).toHaveAttribute('href', '/positions');
    expect(screen.getByRole('link', { name: /Swap/ })).toHaveAttribute('href', '/swap');
    expect(screen.getByRole('button', { name: 'Connect' })).toBeInTheDocument();
  });

  it('shows the connected wallet in compact form', () => {
    wagmiState.address = '0x1234567890123456789012345678901234567890';
    wagmiState.isConnected = true;

    render(<BaseAppContent />);

    expect(screen.getByText('0x1234...7890')).toBeInTheDocument();
  });
});
