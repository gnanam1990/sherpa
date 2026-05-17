import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Prompt } from './Prompt';

const sendSponsoredCallsAsync = vi.hoisted(() => vi.fn(async () => ({ id: 'calls-id' })));
const callsStatusState = vi.hoisted(() => ({
  current: {
    data: undefined as
      | { receipts?: Array<{ transactionHash?: string }>; status?: 'pending' | 'success' | 'failure' }
      | undefined,
    error: null as Error | null,
    isError: false,
  },
}));

vi.mock('../../lib/wagmi', () => ({
  useSherpaCallsStatus: () => callsStatusState.current,
  useSherpaSendCalls: () => ({ sendSponsoredCallsAsync }),
}));

const USER_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const DEFAULT_INPUT = `send 5 usdc to ${USER_ADDRESS}`;
const TX_HASH = `0x${'b'.repeat(64)}`;
const WALLET_REJECTED_ERROR =
  'User rejected the request. Request Arguments: chain: undefined (id: 84532) Details: User cancelled transaction Version: viem@2.48.4';

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
  return { ok: true, auditLogId: 7, planHash: `0x${'a'.repeat(64)}`, card: sendCard(true) };
}

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  window.localStorage.clear();
  callsStatusState.current = { data: undefined, error: null, isError: false };
  sendSponsoredCallsAsync.mockClear();
  sendSponsoredCallsAsync.mockResolvedValue({ id: 'calls-id' });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Prompt', () => {
  it('disables input when wallet is disconnected and renders empty thread', () => {
    render(<Prompt isConnected={false} />);

    expect((screen.getByLabelText('Sherpa prompt') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Preview' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(screen.getByText('Type anything to get started')).toBeTruthy();
  });

  it('adds user and thinking bubbles immediately, then replaces thinking with ConfirmationCard', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    let resolveParse: (value: Response) => void = () => undefined;
    const parseResponse = new Promise<Response>((resolve) => {
      resolveParse = resolve;
    });
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url === `/api/history/${USER_ADDRESS}?limit=50`) {
        return jsonResponse({ address: USER_ADDRESS, chain: 'base-sepolia', items: [] });
      }
      if (url === '/api/parse') {
        expect(JSON.parse(init?.body as string)).toMatchObject({ input: DEFAULT_INPUT });
        return parseResponse;
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<Prompt isConnected userAddress={USER_ADDRESS} />);
    fireEvent.change(screen.getByLabelText('Sherpa prompt'), { target: { value: DEFAULT_INPUT } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(screen.getByText(DEFAULT_INPUT)).toBeTruthy();
    expect(screen.getByLabelText('Sherpa is thinking')).toBeTruthy();
    expect(
      screen
        .getByText(DEFAULT_INPUT)
        .compareDocumentPosition(screen.getByLabelText('Sherpa is thinking')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Preview' }).textContent).toBe('Preview');

    resolveParse(
      await jsonResponse({ parsed: { intent: 'SEND', confidence: 1 }, card: sendCard() }),
    );
    expect(await screen.findByRole('heading', { name: 'Send 5 USDC' })).toBeTruthy();
    expect(screen.queryByLabelText('Sherpa is thinking')).toBeNull();
  });

  it('renders BALANCE results directly in the thread', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === `/api/history/${USER_ADDRESS}?limit=50`) {
        return jsonResponse({ address: USER_ADDRESS, chain: 'base-sepolia', items: [] });
      }
      if (url === '/api/parse') {
        return jsonResponse({ parsed: { intent: 'BALANCE', confidence: 0.95 } });
      }
      if (url === `/api/balance/${USER_ADDRESS}`) {
        return jsonResponse({
          address: USER_ADDRESS,
          chain: 'base-sepolia',
          balances: { ETH: '0.25', USDC: '5.00' },
        });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<Prompt isConnected userAddress={USER_ADDRESS} />);
    fireEvent.change(screen.getByLabelText('Sherpa prompt'), {
      target: { value: "what's my balance" },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(await screen.findByText(/Balance on base-sepolia/)).toBeTruthy();
    expect(screen.getByText(/ETH: 0.25/)).toBeTruthy();
    expect(screen.getByText(/USDC: 5.00/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Proceed' })).toBeNull();
  });

  it('renders HISTORY results directly in the thread', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === `/api/history/${USER_ADDRESS}?limit=50`) {
        return jsonResponse({ address: USER_ADDRESS, chain: 'base-sepolia', items: [] });
      }
      if (url === '/api/parse') {
        return jsonResponse({
          parsed: { intent: 'HISTORY', confidence: 0.9, slots: { limit: 5 } },
        });
      }
      if (url === `/api/history/${USER_ADDRESS}?limit=5`) {
        return jsonResponse({
          address: USER_ADDRESS,
          chain: 'base-sepolia',
          items: [
            {
              txHash: TX_HASH,
              timestamp: 1,
              direction: 'out',
              counterparty: USER_ADDRESS,
              asset: 'USDC',
              amountDisplay: '5.00 USDC',
              sherpaIntent: 'SEND',
            },
          ],
        });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<Prompt isConnected userAddress={USER_ADDRESS} />);
    fireEvent.change(screen.getByLabelText('Sherpa prompt'), {
      target: { value: 'show my last 5 txs' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    const history = await screen.findByText(/Recent transactions on base-sepolia/);
    expect(history.textContent).toContain(`OUT 5.00 USDC to ${USER_ADDRESS}`);
    expect(history.textContent).toContain(`Tx: ${TX_HASH.slice(0, 10)}...${TX_HASH.slice(-8)}`);
    expect(history.textContent).toContain('Intent: SEND');
    expect(screen.queryByRole('button', { name: 'Proceed' })).toBeNull();
  });

  it('renders POSITIONS results directly in the thread', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === `/api/history/${USER_ADDRESS}?limit=50`) {
        return jsonResponse({ address: USER_ADDRESS, chain: 'base-sepolia', items: [] });
      }
      if (url === '/api/parse') {
        return jsonResponse({ parsed: { intent: 'POSITIONS', confidence: 0.92 } });
      }
      if (url === `/api/positions/${USER_ADDRESS}`) {
        return jsonResponse({
          totalCollateralBase: '1234567890',
          totalDebtBase: '250000000',
          availableBorrowsBase: '500000000',
          currentLiquidationThreshold: '8250',
          ltv: '7800',
          healthFactor: '3300000000000000000',
          hasPosition: true,
          fetchedAt: '2026-05-16T00:00:00.000Z',
        });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<Prompt isConnected userAddress={USER_ADDRESS} />);
    fireEvent.change(screen.getByLabelText('Sherpa prompt'), {
      target: { value: 'show my positions' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    const positions = await screen.findByText(/Aave V3 positions on Base/);
    expect(positions.textContent).toContain('Health factor: 3.30');
    expect(positions.textContent).toContain('Collateral: $12.34');
    expect(positions.textContent).toContain('Debt: $2.50');
    expect(screen.queryByRole('button', { name: 'Proceed' })).toBeNull();
  });

  it('renders empty POSITIONS state directly in the thread', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === `/api/history/${USER_ADDRESS}?limit=50`) {
        return jsonResponse({ address: USER_ADDRESS, chain: 'base-sepolia', items: [] });
      }
      if (url === '/api/parse') {
        return jsonResponse({ parsed: { intent: 'POSITIONS', confidence: 0.92 } });
      }
      if (url === `/api/positions/${USER_ADDRESS}`) {
        return jsonResponse({
          totalCollateralBase: '0',
          totalDebtBase: '0',
          availableBorrowsBase: '0',
          currentLiquidationThreshold: '0',
          ltv: '0',
          healthFactor: `${2n ** 256n - 1n}`,
          hasPosition: false,
          fetchedAt: '2026-05-16T00:00:00.000Z',
        });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<Prompt isConnected userAddress={USER_ADDRESS} />);
    fireEvent.change(screen.getByLabelText('Sherpa prompt'), {
      target: { value: 'health factor' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(await screen.findByText(/No Aave V3 positions on Base/)).toBeTruthy();
    expect(screen.getByText(/coming soon after audit/)).toBeTruthy();
  });

  it('renders Stage 2 coming-soon results without a confirmation card', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === `/api/history/${USER_ADDRESS}?limit=50`) {
        return jsonResponse({ address: USER_ADDRESS, chain: 'base-sepolia', items: [] });
      }
      if (url === '/api/parse') {
        return jsonResponse({
          parsed: {
            intent: 'SWAP',
            confidence: 0.9,
            slots: { fromAmount: '1', fromAsset: 'USDC', toAsset: 'ETH' },
          },
          stage2: { status: 'coming_soon', reason: 'pending_external_audit' },
        });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<Prompt isConnected userAddress={USER_ADDRESS} />);
    fireEvent.change(screen.getByLabelText('Sherpa prompt'), {
      target: { value: 'swap 1 usdc for eth' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(await screen.findByText(/Swap - Coming soon/)).toBeTruthy();
    expect(screen.getByText(/pending external audit/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Proceed' })).toBeNull();
  });

  it('renders IDENTITY_LOOKUP results directly in the thread', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === `/api/history/${USER_ADDRESS}?limit=50`) {
        return jsonResponse({ address: USER_ADDRESS, chain: 'base-sepolia', items: [] });
      }
      if (url === '/api/parse') {
        return jsonResponse({
          parsed: { intent: 'IDENTITY_LOOKUP', confidence: 0.9, slots: { query: 'jesse.base.eth' } },
          card: {
            intent: 'IDENTITY_LOOKUP',
            primary_action_label: 'Lookup identity',
            primary_amount_display: 'jesse.base.eth',
            secondary_amount_display: USER_ADDRESS,
            recipient_display: USER_ADDRESS,
            recipient_metadata: { source: 'basename', query: 'jesse.base.eth' },
            steps: [],
            gas_display: '$0.00 (read-only)',
            warnings: [],
            estimated_completion_ms: 500,
          },
        });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<Prompt isConnected userAddress={USER_ADDRESS} />);
    fireEvent.change(screen.getByLabelText('Sherpa prompt'), {
      target: { value: 'who is jesse.base.eth' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(await screen.findByText(/Resolved jesse.base.eth/)).toBeTruthy();
    expect(screen.getByText(new RegExp(USER_ADDRESS))).toBeTruthy();
    expect(screen.getByText(/Source: basename/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Proceed' })).toBeNull();
  });

  it('runs parse -> execute -> wallet -> confirm and updates the thread with success summary', async () => {
    callsStatusState.current = {
      data: { receipts: [{ transactionHash: TX_HASH }], status: 'success' },
      error: null,
      isError: false,
    };
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url === `/api/history/${USER_ADDRESS}?limit=50`) {
        return jsonResponse({ address: USER_ADDRESS, chain: 'base-sepolia', items: [] });
      }
      if (url === '/api/parse') {
        expect(JSON.parse(init?.body as string)).toMatchObject({ userKey: USER_ADDRESS });
        return jsonResponse({ parsed: { intent: 'SEND', confidence: 1 }, card: sendCard() });
      }
      if (url === '/api/execute') {
        expect(JSON.parse(init?.body as string)).toMatchObject({ userAddress: USER_ADDRESS });
        return jsonResponse(executeBody());
      }
      if (url === '/api/execute/7/confirm') {
        expect(init?.method).toBe('POST');
        expect(JSON.parse(init?.body as string)).toMatchObject({ txHash: TX_HASH });
        return jsonResponse({ ok: true, status: 'success', txHash: TX_HASH });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<Prompt isConnected userAddress={USER_ADDRESS} />);
    fireEvent.change(screen.getByLabelText('Sherpa prompt'), { target: { value: DEFAULT_INPUT } });
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    await flushAsyncWork();
    screen.getByRole('heading', { name: 'Send 5 USDC' });
    fireEvent.click(screen.getByRole('button', { name: 'Proceed' }));
    await flushAsyncWork();
    expect(sendSponsoredCallsAsync).toHaveBeenCalledTimes(1);
    await flushAsyncWork();

    expect(screen.getByText('Sent 5 USDC')).toBeTruthy();
    expect(screen.getByText(`to ${USER_ADDRESS}`)).toBeTruthy();
    expect(screen.getByRole('link', { name: /view on basescan/i }).getAttribute('href')).toBe(
      `https://sepolia.basescan.org/tx/${TX_HASH}`,
    );
  });

  it('updates the thread with a failed action summary when wallet execution fails', async () => {
    sendSponsoredCallsAsync.mockRejectedValueOnce(new Error('SIMULATION_FAILED'));
    const fetchMock = vi.fn((url: string) => {
      if (url === `/api/history/${USER_ADDRESS}?limit=50`) {
        return jsonResponse({ address: USER_ADDRESS, chain: 'base-sepolia', items: [] });
      }
      if (url === '/api/parse') {
        return jsonResponse({ parsed: { intent: 'SEND', confidence: 1 }, card: sendCard() });
      }
      if (url === '/api/execute') return jsonResponse(executeBody());
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<Prompt isConnected userAddress={USER_ADDRESS} />);
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    await screen.findByRole('heading', { name: 'Send 5 USDC' });
    fireEvent.click(screen.getByRole('button', { name: 'Proceed' }));

    expect(await screen.findByText('Transaction failed')).toBeTruthy();
    expect(
      screen.getByText('Transaction would fail. Try a smaller amount or different recipient.'),
    ).toBeTruthy();
  });

  it('renders wallet rejection as a cancellation and reports the failed audit result', async () => {
    sendSponsoredCallsAsync.mockRejectedValueOnce(new Error(WALLET_REJECTED_ERROR));
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url === `/api/history/${USER_ADDRESS}?limit=50`) {
        return jsonResponse({ address: USER_ADDRESS, chain: 'base-sepolia', items: [] });
      }
      if (url === '/api/parse') {
        return jsonResponse({ parsed: { intent: 'SEND', confidence: 1 }, card: sendCard() });
      }
      if (url === '/api/execute') return jsonResponse(executeBody());
      if (url === '/api/execute/7/confirm') {
        expect(init?.method).toBe('POST');
        expect(JSON.parse(init?.body as string)).toMatchObject({ error: WALLET_REJECTED_ERROR });
        return jsonResponse({ ok: true });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<Prompt isConnected userAddress={USER_ADDRESS} />);
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    await screen.findByRole('heading', { name: 'Send 5 USDC' });
    fireEvent.click(screen.getByRole('button', { name: 'Proceed' }));

    expect(await screen.findByText('Transaction cancelled')).toBeTruthy();
    expect(screen.getByText('Wallet request was cancelled.')).toBeTruthy();
    expect(screen.queryByText('Transaction failed')).toBeNull();
  });
});
