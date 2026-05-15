import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatThread } from './ChatThread';

vi.mock('@/lib/sdk', () => ({
  initFrame: vi.fn(),
  composeCast: vi.fn(),
  isInFarcasterFrame: vi.fn(() => false),
}));

describe('ChatThread', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('renders header with Sherpa title', () => {
    render(<ChatThread />);
    expect(screen.getByText('Sherpa')).toBeDefined();
  });

  test('renders input field', () => {
    render(<ChatThread />);
    expect(screen.getByPlaceholderText(/send 0.1 eth/i)).toBeDefined();
  });

  test('renders send button', () => {
    render(<ChatThread />);
    expect(screen.getByText('Send')).toBeDefined();
  });

  test('disables send button when input empty', () => {
    render(<ChatThread />);
    const button = screen.getByText('Send') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  test('shows user message after submit', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ message: 'Parsed: SEND 0.1 ETH' })),
    );

    render(<ChatThread />);
    const input = screen.getByPlaceholderText(/send 0.1 eth/i);
    fireEvent.change(input, { target: { value: 'send 0.1 ETH' } });
    fireEvent.click(screen.getByText('Send'));

    expect(await screen.findByText('send 0.1 ETH')).toBeDefined();
  });

  test('calls API with correct payload', async () => {
    const fetchMock = vi.fn(async () => Response.json({ message: 'OK' }));
    vi.stubGlobal('fetch', fetchMock);

    render(<ChatThread />);
    const input = screen.getByPlaceholderText(/send 0.1 eth/i);
    fireEvent.change(input, { target: { value: 'send 0.1 ETH' } });
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const callArgs = fetchMock.mock.calls[0] as unknown[];
    expect(callArgs).toBeDefined();
    expect(callArgs![0]).toContain('/api/parse');
    const opts = callArgs![1] as RequestInit;
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body as string);
    expect(body.input).toBe('send 0.1 ETH');
  });

  test('shows assistant response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ message: 'Parsed: SEND 0.1 ETH' })),
    );

    render(<ChatThread />);
    fireEvent.change(screen.getByPlaceholderText(/send 0.1 eth/i), {
      target: { value: 'send 0.1 ETH' },
    });
    fireEvent.click(screen.getByText('Send'));

    expect(await screen.findByText('Parsed: SEND 0.1 ETH')).toBeDefined();
  });

  test('shows error message on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network'); }));

    render(<ChatThread />);
    fireEvent.change(screen.getByPlaceholderText(/send 0.1 eth/i), {
      target: { value: 'send 0.1 ETH' },
    });
    fireEvent.click(screen.getByText('Send'));

    expect(
      await screen.findByText('Something went wrong. Please try again.'),
    ).toBeDefined();
  });
});
