import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const wagmiState = vi.hoisted(() => ({
  isConnected: false,
  address: undefined as `0x${string}` | undefined,
}));

vi.mock('wagmi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wagmi')>();
  return {
    ...actual,
    useAccount: () => ({ isConnected: wagmiState.isConnected, address: wagmiState.address }),
  };
});

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('token=test-token-123'),
}));

const sendSponsoredCalls = vi.fn();
vi.mock('../../lib/wagmi', () => ({
  useSherpaSendCalls: () => ({
    sendSponsoredCalls,
    data: undefined,
    error: null,
    isError: false,
    isPending: false,
  }),
  useSherpaCallsStatus: () => ({ data: undefined }),
}));

vi.mock('@sherpa/ui', () => ({
  ConfirmationCard: ({ card }: { card: any }) => (
    <div data-testid="confirmation-card">{card?.intent ?? 'card'}</div>
  ),
  ConnectButton: (props: any) => <button {...props}>Connect Wallet</button>,
}));

describe('SignFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    wagmiState.isConnected = false;
    wagmiState.address = undefined;
  });

  it('shows loading state initially', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        surface: 'telegram',
        surfaceUserId: '12345',
        intentPayload: { intent: 'SEND' },
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
        consumed: false,
      }),
    });

    const { SignFlow } = await import('./SignFlow');
    render(<SignFlow />);
    expect(screen.getByText('Loading token...')).toBeDefined();
  });

  it('shows error when token is missing', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'token not found' }),
    });

    const { SignFlow } = await import('./SignFlow');
    render(<SignFlow />);
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeDefined();
      expect(screen.getByText('token not found')).toBeDefined();
    });
  });

  it('renders confirmation card for valid token', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        surface: 'telegram',
        surfaceUserId: '12345',
        intentPayload: {
          intent: 'SEND',
          primary_action_label: 'Send',
          primary_amount_display: '0.1 ETH',
        },
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
        consumed: false,
      }),
    });

    const { SignFlow } = await import('./SignFlow');
    render(<SignFlow />);
    await waitFor(() => {
      expect(screen.getByText('Sign Transaction')).toBeDefined();
    });
  });

  it('shows connect button when not connected', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        surface: 'telegram',
        surfaceUserId: '12345',
        intentPayload: { intent: 'SEND' },
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
        consumed: false,
      }),
    });

    wagmiState.isConnected = false;
    const { SignFlow } = await import('./SignFlow');
    render(<SignFlow />);
    await waitFor(() => {
      expect(screen.getByText('Connect Wallet')).toBeDefined();
    });
  });

  it('shows sign button when connected', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        surface: 'telegram',
        surfaceUserId: '12345',
        intentPayload: {
          intent: 'SEND',
          primary_action_label: 'Send',
          primary_amount_display: '0.1 ETH',
          batch: {
            version: '1.0',
            chainId: '0x14a34',
            calls: [{ to: '0x0000000000000000000000000000000000000001', data: '0x', value: '0x0' }],
          },
        },
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
        consumed: false,
      }),
    });

    wagmiState.isConnected = true;
    wagmiState.address = '0x1234567890abcdef1234567890abcdef12345678';
    const { SignFlow } = await import('./SignFlow');
    render(<SignFlow />);
    await waitFor(() => {
      expect(screen.getByText('Confirm & Sign')).toBeDefined();
    });
  });

  it('shows error for expired token', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'token expired' }),
    });

    const { SignFlow } = await import('./SignFlow');
    render(<SignFlow />);
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeDefined();
      expect(screen.getByText('token expired')).toBeDefined();
    });
  });

  it('shows error for consumed token', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'token already consumed' }),
    });

    const { SignFlow } = await import('./SignFlow');
    render(<SignFlow />);
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeDefined();
      expect(screen.getByText('token already consumed')).toBeDefined();
    });
  });

  it('displays surface and expiry info', async () => {
    const expiresAt = new Date(Date.now() + 300_000).toISOString();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        surface: 'telegram',
        surfaceUserId: '12345',
        intentPayload: { intent: 'SEND' },
        expiresAt,
        consumed: false,
      }),
    });

    const { SignFlow } = await import('./SignFlow');
    render(<SignFlow />);
    await waitFor(() => {
      expect(screen.getByText(/Surface: telegram/)).toBeDefined();
    });
  });

  it('renders intent payload without card', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        surface: 'telegram',
        surfaceUserId: '12345',
        intentPayload: { intent: 'BALANCE', params: { asset: 'ETH' } },
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
        consumed: false,
      }),
    });

    const { SignFlow } = await import('./SignFlow');
    render(<SignFlow />);
    await waitFor(() => {
      expect(screen.getByText('BALANCE')).toBeDefined();
      expect(screen.getByText('asset')).toBeDefined();
      expect(screen.getByText('ETH')).toBeDefined();
    });
  });

  it('shows error for non-executable intent', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        surface: 'telegram',
        surfaceUserId: '12345',
        intentPayload: {
          intent: 'SEND',
          primary_action_label: 'Send',
          primary_amount_display: '0.1 ETH',
        },
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
        consumed: false,
      }),
    });

    wagmiState.isConnected = true;
    wagmiState.address = '0x1234567890abcdef1234567890abcdef12345678';
    const { SignFlow } = await import('./SignFlow');
    render(<SignFlow />);
    await waitFor(() => {
      expect(screen.getByText('Confirm & Sign')).toBeDefined();
    });
  });
});
