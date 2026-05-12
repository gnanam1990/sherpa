import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { HomeContent } from './HomeContent';

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

vi.mock('../../lib/wagmi', () => ({
  useSherpaSendCalls: () => ({ sendSponsoredCalls: vi.fn() }),
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

describe('HomeContent', () => {
  it('renders header and hero connect buttons when disconnected', () => {
    wagmiState.address = undefined;
    wagmiState.isConnected = false;

    render(<HomeContent />);

    expect(document.body.contains(screen.getByRole('button', { name: 'Connect' }))).toBe(true);
    expect(document.body.contains(screen.getByRole('button', { name: 'Connect wallet' }))).toBe(
      true,
    );
  });

  it('shows the connected wallet address and hides the hero connect button', () => {
    wagmiState.address = '0x1234567890123456789012345678901234567890';
    wagmiState.isConnected = true;

    render(<HomeContent />);

    expect(document.body.contains(screen.getByText('0x1234...7890'))).toBe(true);
    expect(screen.queryByRole('button', { name: 'Connect wallet' })).toBeNull();
  });

  it('preserves session state and shows a reconnect toast on disconnect', () => {
    wagmiState.address = '0x1234567890123456789012345678901234567890';
    wagmiState.isConnected = true;
    render(<HomeContent />);

    wagmiState.accountEffect?.onDisconnect?.();

    expect(toast.custom).toHaveBeenCalledTimes(1);
  });

  it('fetches fresh history when an account connects', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    wagmiState.address = '0x1234567890123456789012345678901234567890';
    wagmiState.isConnected = true;
    render(<HomeContent />);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/history/0x1234567890123456789012345678901234567890',
      ),
    );
  });

  it('fetches fresh history when the connected address changes', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    wagmiState.address = '0x1234567890123456789012345678901234567890';
    wagmiState.isConnected = true;
    const { rerender } = render(<HomeContent />);

    wagmiState.address = '0x0000000000000000000000000000000000000001';
    rerender(<HomeContent />);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/history/0x0000000000000000000000000000000000000001',
      ),
    );
  });
});
