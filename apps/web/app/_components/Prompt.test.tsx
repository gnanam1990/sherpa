import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Prompt } from './Prompt';

const sendSponsoredCallsAsync = vi.hoisted(() => vi.fn(async () => ({ id: 'calls-id' })));

vi.mock('../../lib/wagmi', () => ({
  useSherpaSendCalls: () => ({ sendSponsoredCallsAsync }),
}));

const USER_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const DEFAULT_INPUT = `send 5 usdc to ${USER_ADDRESS}`;
const PLAN_HASH = `0x${'a'.repeat(64)}`;
const TX_HASH = `0x${'b'.repeat(64)}`;

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

function sendCard(withBatch = false) {
  return {
    intent: 'SEND',
    primary_action_label: 'Send',
    primary_amount_display: '5 USDC',
    secondary_amount_display: '≈ $5.00',
    recipient_display: USER_ADDRESS,
    recipient_metadata: { source: 'direct' },
    steps: [
      {
        kind: 'transfer',
        to: USER_ADDRESS,
        data: '0x1234',
        value: '0x0',
        label: `Transfer 5 USDC to ${USER_ADDRESS}`,
      },
    ],
    ...(withBatch
      ? {
          batch: {
            version: '1.0',
            chainId: '0x14a34',
            capabilities: { paymasterService: { url: '/api/paymaster' } },
            calls: [{ to: USER_ADDRESS, data: '0x1234', value: '0x0' }],
          },
        }
      : {}),
    gas_display: '$0.00 (sponsored ✓)',
    warnings: [],
    estimated_completion_ms: 4000,
  };
}

function executeBody() {
  return { ok: true, auditLogId: 7, planHash: PLAN_HASH, card: sendCard(true) };
}

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  sendSponsoredCallsAsync.mockClear();
  sendSponsoredCallsAsync.mockResolvedValue({ id: 'calls-id' });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Prompt', () => {
  it('disables input when wallet is disconnected', () => {
    render(<Prompt isConnected={false} />);

    const input = screen.getByLabelText('Sherpa prompt') as HTMLInputElement;
    const button = screen.getByRole('button', { name: 'Preview' }) as HTMLButtonElement;
    expect(input.disabled).toBe(true);
    expect(input.getAttribute('title')).toBe('Connect wallet to start');
    expect(button.disabled).toBe(true);
  });

  it('runs Prompt -> parse -> Proceed -> execute -> wallet -> confirm poll -> success', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url === '/api/parse') {
        expect(JSON.parse(init?.body as string)).toMatchObject({
          input: DEFAULT_INPUT,
          userKey: USER_ADDRESS,
        });
        return jsonResponse({ parsed: { intent: 'SEND', confidence: 1 }, card: sendCard() });
      }
      if (url === '/api/execute') {
        expect(JSON.parse(init?.body as string)).toMatchObject({
          input: DEFAULT_INPUT,
          userAddress: USER_ADDRESS,
        });
        return jsonResponse(executeBody());
      }
      if (url === '/api/execute/7/confirm') {
        expect(init).toMatchObject({ method: 'GET' });
        return jsonResponse({ ok: true, status: 'success', txHash: TX_HASH });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<Prompt isConnected userAddress={USER_ADDRESS} />);

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    await flushAsyncWork();
    expect(screen.getByRole('heading', { name: 'Send 5 USDC' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Proceed' }));

    await flushAsyncWork();
    expect(sendSponsoredCallsAsync).toHaveBeenCalledTimes(1);
    expect(sendSponsoredCallsAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        capabilities: { paymasterService: { url: '/api/paymaster' } },
        chainId: 84532,
        calls: [{ to: USER_ADDRESS, data: '0x1234', value: 0n }],
      }),
    );

    await act(async () => vi.advanceTimersByTimeAsync(1000));
    await flushAsyncWork();

    expect(screen.getByText('Transaction confirmed')).toBeTruthy();
    expect(screen.getByRole('link', { name: /view on basescan/i }).getAttribute('href')).toBe(
      `https://sepolia.basescan.org/tx/${TX_HASH}`,
    );
  });

  it('renders a translated failure card when confirmation polling fails', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((url: string) => {
      if (url === '/api/parse') {
        return jsonResponse({ parsed: { intent: 'SEND', confidence: 1 }, card: sendCard() });
      }
      if (url === '/api/execute') return jsonResponse(executeBody());
      if (url === '/api/execute/7/confirm') {
        return jsonResponse({ ok: true, status: 'failed', error_detail: 'SIMULATION_FAILED' });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<Prompt isConnected userAddress={USER_ADDRESS} />);
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    await flushAsyncWork();
    screen.getByRole('heading', { name: 'Send 5 USDC' });
    fireEvent.click(screen.getByRole('button', { name: 'Proceed' }));
    await flushAsyncWork();
    expect(sendSponsoredCallsAsync).toHaveBeenCalledTimes(1);

    await act(async () => vi.advanceTimersByTimeAsync(1000));
    await flushAsyncWork();

    expect(
      screen.getByText('Transaction would fail. Try a smaller amount or different recipient.'),
    ).toBeTruthy();
    expect(screen.getByText('We tried to: Send 5 USDC')).toBeTruthy();
  });

  it('keeps the original prompt on Edit and retry, and clears it on Send another', async () => {
    sendSponsoredCallsAsync.mockRejectedValueOnce(new Error('SIMULATION_FAILED'));
    const fetchMock = vi.fn((url: string) => {
      if (url === '/api/parse') {
        return jsonResponse({ parsed: { intent: 'SEND', confidence: 1 }, card: sendCard() });
      }
      if (url === '/api/execute') return jsonResponse(executeBody());
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<Prompt isConnected userAddress={USER_ADDRESS} />);
    const input = screen.getByLabelText('Sherpa prompt') as HTMLInputElement;
    fireEvent.change(input, { target: { value: DEFAULT_INPUT } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    await screen.findByRole('heading', { name: 'Send 5 USDC' });
    fireEvent.click(screen.getByRole('button', { name: 'Proceed' }));

    expect(
      await screen.findByText(
        'Transaction would fail. Try a smaller amount or different recipient.',
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Edit and retry' }));
    expect(input.value).toBe(DEFAULT_INPUT);
    expect(document.activeElement).toBe(input);

    sendSponsoredCallsAsync.mockRejectedValueOnce(new Error('SIMULATION_FAILED'));
    fireEvent.click(screen.getByRole('button', { name: 'Proceed' }));
    expect(
      await screen.findByText(
        'Transaction would fail. Try a smaller amount or different recipient.',
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Send another' }));
    expect(input.value).toBe('');
    expect(document.activeElement).toBe(input);
  });

  it('does not submit wallet calls if the wallet disconnects while execute is in flight', async () => {
    let resolveExecute: (value: Response) => void = () => undefined;
    const executeResponse = new Promise<Response>((resolve) => {
      resolveExecute = resolve;
    });
    const fetchMock = vi.fn((url: string) => {
      if (url === '/api/parse') {
        return jsonResponse({ parsed: { intent: 'SEND', confidence: 1 }, card: sendCard() });
      }
      if (url === '/api/execute') return executeResponse;
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const { rerender } = render(<Prompt isConnected userAddress={USER_ADDRESS} />);
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    await screen.findByRole('heading', { name: 'Send 5 USDC' });
    fireEvent.click(screen.getByRole('button', { name: 'Proceed' }));

    rerender(
      <Prompt
        isConnected={false}
        userAddress={USER_ADDRESS}
        disconnectedCopy="Connect wallet to continue"
      />,
    );

    resolveExecute(await jsonResponse(executeBody()));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(sendSponsoredCallsAsync).not.toHaveBeenCalled();
  });

  it('does not submit stale wallet calls after reconnecting the same address', async () => {
    let resolveExecute: (value: Response) => void = () => undefined;
    const executeResponse = new Promise<Response>((resolve) => {
      resolveExecute = resolve;
    });
    const fetchMock = vi.fn((url: string) => {
      if (url === '/api/parse') {
        return jsonResponse({ parsed: { intent: 'SEND', confidence: 1 }, card: sendCard() });
      }
      if (url === '/api/execute') return executeResponse;
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const { rerender } = render(
      <Prompt connectionEpoch={0} isConnected userAddress={USER_ADDRESS} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    await screen.findByRole('heading', { name: 'Send 5 USDC' });
    fireEvent.click(screen.getByRole('button', { name: 'Proceed' }));

    rerender(<Prompt connectionEpoch={1} isConnected userAddress={USER_ADDRESS} />);
    resolveExecute(await jsonResponse(executeBody()));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(sendSponsoredCallsAsync).not.toHaveBeenCalled();
  });
});
