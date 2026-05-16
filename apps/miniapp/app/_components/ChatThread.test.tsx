import { describe, test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatThread } from './ChatThread';

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

vi.mock('../../lib/farcaster-connect', () => ({
  getFarcasterUser: () => Promise.resolve(null),
}));

describe('ChatThread', () => {
  afterEach(() => {
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
