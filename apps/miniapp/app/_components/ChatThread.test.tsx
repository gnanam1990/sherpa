import { describe, test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatThread } from './ChatThread';
import { config } from '../../lib/wagmi';

vi.mock('@/lib/sdk', () => ({
  initFrame: vi.fn(),
  composeCast: vi.fn(),
  isInFarcasterFrame: vi.fn(() => false),
}));

vi.mock('wagmi', async () => {
  const actual = await vi.importActual('wagmi');
  return {
    ...actual,
    useAccount: () => ({ address: '0x1234', isConnected: true, chain: { id: 8453 } }),
    useConnect: () => ({ connect: vi.fn(), connectors: [], isPending: false }),
    useDisconnect: () => ({ disconnect: vi.fn() }),
  };
});

const queryClient = new QueryClient();

function renderWithProviders(ui: React.ReactNode) {
  return render(
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    </WagmiProvider>,
  );
}

describe('ChatThread', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('renders header with Sherpa title', () => {
    renderWithProviders(<ChatThread />);
    expect(screen.getByText('Sherpa')).toBeDefined();
  });

  test('renders input field', () => {
    renderWithProviders(<ChatThread />);
    expect(screen.getByPlaceholderText(/ask sherpa/i)).toBeDefined();
  });

  test('renders send button', () => {
    renderWithProviders(<ChatThread />);
    expect(screen.getByText('Send')).toBeDefined();
  });

  test('disables send button when input empty', () => {
    renderWithProviders(<ChatThread />);
    const button = screen.getByText('Send') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  test('shows user message after submit', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ response: 'Parsed: SEND 0.1 ETH' })),
    );

    renderWithProviders(<ChatThread />);
    const input = screen.getByPlaceholderText(/ask sherpa/i);
    fireEvent.change(input, { target: { value: 'send 0.1 ETH' } });
    fireEvent.click(screen.getByText('Send'));

    expect(await screen.findByText('send 0.1 ETH')).toBeDefined();
  });

  test('calls API with correct payload', async () => {
    const fetchMock = vi.fn(async () => Response.json({ response: 'OK' }));
    vi.stubGlobal('fetch', fetchMock);

    renderWithProviders(<ChatThread />);
    const input = screen.getByPlaceholderText(/ask sherpa/i);
    fireEvent.change(input, { target: { value: 'send 0.1 ETH' } });
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const callArgs = fetchMock.mock.calls[0] as unknown[];
    expect(callArgs).toBeDefined();
    expect(callArgs![0]).toContain('/api/chat');
    const opts = callArgs![1] as RequestInit;
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body as string);
    expect(body.message).toBe('send 0.1 ETH');
  });

  test('shows assistant response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ response: 'Parsed: SEND 0.1 ETH' })),
    );

    renderWithProviders(<ChatThread />);
    fireEvent.change(screen.getByPlaceholderText(/ask sherpa/i), {
      target: { value: 'send 0.1 ETH' },
    });
    fireEvent.click(screen.getByText('Send'));

    expect(await screen.findByText('Parsed: SEND 0.1 ETH')).toBeDefined();
  });

  test('shows error message on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network'); }));

    renderWithProviders(<ChatThread />);
    fireEvent.change(screen.getByPlaceholderText(/ask sherpa/i), {
      target: { value: 'send 0.1 ETH' },
    });
    fireEvent.click(screen.getByText('Send'));

    expect(
      await screen.findByText('Something went wrong. Please try again.'),
    ).toBeDefined();
  });
});
