import { describe, test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatThread, formatAssistantText } from './ChatThread';

vi.mock('@coinbase/onchainkit/minikit', () => ({
  useMiniKit: () => ({
    setFrameReady: vi.fn(),
    isFrameReady: true,
    context: null,
  }),
  useAddFrame: () => vi.fn(),
}));

vi.mock('wagmi', async () => {
  const actual = await vi.importActual('wagmi');
  return {
    ...actual,
    useAccount: () => ({ address: '0x1234567890abcdef1234567890abcdef12345678', isConnected: true }),
  };
});

const fcState = vi.hoisted(() => ({
  user: null as null | { fid: number; username?: string },
  status: false,
  addResult: {
    added: true,
    notificationDetails: {
      token: 'tok',
      url: 'https://api.farcaster.xyz/v1/frame-notifications',
    },
  },
}));

vi.mock('../../lib/farcaster-connect', () => ({
  getFarcasterUser: () => Promise.resolve(fcState.user),
  getFarcasterNotificationStatus: () => Promise.resolve(fcState.status),
  addSherpaMiniApp: vi.fn(() => Promise.resolve(fcState.addResult)),
  saveFarcasterNotificationDetails: vi.fn(() => Promise.resolve()),
}));

describe('ChatThread', () => {
  afterEach(() => {
    fcState.user = null;
    fcState.status = false;
    vi.restoreAllMocks();
  });

  test('renders input field with placeholder', () => {
    render(<ChatThread />);
    expect(screen.getByPlaceholderText(/send 0.01 usdc/i)).toBeDefined();
  });

  test('renders send button', () => {
    render(<ChatThread />);
    expect(screen.getByText('Send')).toBeDefined();
  });

  test('shows Farcaster alert readiness when Mini App token is active', async () => {
    fcState.user = { fid: 976779, username: 'gnanam' };
    fcState.status = true;

    render(<ChatThread />);

    expect(await screen.findByText(/Farcaster alerts ready/)).toBeDefined();
    expect(screen.queryByText('Enable alerts')).toBeNull();
  });

  test('can request Farcaster alert enablement from the Mini App', async () => {
    const farcaster = await import('../../lib/farcaster-connect');
    fcState.user = { fid: 976779, username: 'gnanam' };
    fcState.status = false;

    render(<ChatThread />);
    const button = await screen.findByText('Enable alerts');
    fireEvent.click(button);

    await waitFor(() => {
      expect(farcaster.addSherpaMiniApp).toHaveBeenCalled();
      expect(farcaster.saveFarcasterNotificationDetails).toHaveBeenCalledWith(976779, {
        token: 'tok',
        url: 'https://api.farcaster.xyz/v1/frame-notifications',
      });
    });
  });

  test('shows user message after submit', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ parsed: { intent: 'SEND' } })),
    );

    render(<ChatThread />);
    const input = screen.getByPlaceholderText(/send 0.01 usdc/i);
    fireEvent.change(input, { target: { value: 'send 0.1 ETH' } });
    fireEvent.click(screen.getByText('Send'));

    expect(await screen.findByText('send 0.1 ETH')).toBeDefined();
  });

  test('formats identity lookup response for chat display', async () => {
    expect(
      formatAssistantText({
        parsed: { intent: 'IDENTITY_LOOKUP', slots: { query: 'vitalik.eth' } },
        card: {
          recipient_display: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
          recipient_metadata: { query: 'vitalik.eth', source: 'ens' },
        },
      }),
    ).toBe(
      [
        'Resolved vitalik.eth',
        'Address: 0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
        'Source: ens',
      ].join('\n'),
    );
  });

  test('calls /api/parse with correct payload', async () => {
    const fetchMock = vi.fn(async () => Response.json({ parsed: { intent: 'SEND' } }));
    vi.stubGlobal('fetch', fetchMock);

    render(<ChatThread />);
    fireEvent.change(screen.getByPlaceholderText(/send 0.01 usdc/i), {
      target: { value: 'send 0.1 ETH' },
    });
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const callArgs = fetchMock.mock.calls[0] as unknown[];
    expect(callArgs[0]).toContain('/api/parse');
    const opts = callArgs[1] as RequestInit;
    expect(opts.method).toBe('POST');
  });

  test('shows error message on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network'); }));

    render(<ChatThread />);
    fireEvent.change(screen.getByPlaceholderText(/send 0.01 usdc/i), {
      target: { value: 'send 0.1 ETH' },
    });
    fireEvent.click(screen.getByText('Send'));

    expect(
      await screen.findByText('Sherpa is unreachable. Try again.'),
    ).toBeDefined();
  });
});
