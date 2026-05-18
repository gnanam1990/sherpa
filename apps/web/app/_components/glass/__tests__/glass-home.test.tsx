import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// vi.hoisted factories run before module-level consts initialize, so all
// shared fixtures live in one hoisted bag (no outer-const references).
const H = vi.hoisted(() => {
  const USER_ADDRESS =
    '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`;
  const TX_HASH = `0x${'b'.repeat(64)}`;
  return {
    USER_ADDRESS,
    TX_HASH,
    walletState: {
      address: USER_ADDRESS as `0x${string}` | undefined,
      isConnected: true,
    },
    sendSponsoredCallsAsync: vi.fn(async () => ({ id: 'calls-id' })),
    callsStatusState: {
      current: {
        data: {
          receipts: [{ transactionHash: TX_HASH }],
          status: 'success',
        } as
          | { receipts?: Array<{ transactionHash?: string }>; status?: string }
          | undefined,
        error: null as Error | null,
        isError: false,
      },
    },
  };
});
const { USER_ADDRESS, TX_HASH } = H;
const walletState = H.walletState;
const sendSponsoredCallsAsync = H.sendSponsoredCallsAsync;
const callsStatusState = H.callsStatusState;

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('wagmi', () => ({
  useAccount: () => ({
    address: H.walletState.address,
    isConnected: H.walletState.isConnected,
  }),
  useAccountEffect: () => undefined,
  useBalance: () => ({ data: { formatted: '0.2500', symbol: 'ETH' } }),
  useChainId: () => 8453,
  useEnsName: () => ({ data: null }),
}));
vi.mock('../../../../lib/wagmi', () => ({
  useSherpaCallsStatus: () => H.callsStatusState.current,
  useSherpaSendCalls: () => ({
    sendSponsoredCallsAsync: H.sendSponsoredCallsAsync,
  }),
}));
vi.mock('@sherpa/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sherpa/ui')>();
  return { ...actual, ConnectButton: () => <button>Connect Wallet</button> };
});

import { GlassHome } from '../glass-home';

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
    steps: [],
    ...(withBatch
      ? {
          batch: {
            version: '1.0',
            chainId: '0x2105',
            capabilities: { paymasterService: { url: '/api/paymaster' } },
            calls: [{ to: USER_ADDRESS, data: '0x1234', value: '0x0' }],
          },
        }
      : {}),
    gas_display: '$0.00 (sponsored ✓)',
    warnings: ['Confirm the recipient address.'],
    risk_indicators: [{ level: 'info', label: 'Allowlisted token' }],
    estimated_completion_ms: 4000,
  };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  window.localStorage.clear();
  walletState.address = USER_ADDRESS;
  walletState.isConnected = true;
  sendSponsoredCallsAsync.mockClear();
  sendSponsoredCallsAsync.mockResolvedValue({ id: 'calls-id' });
  callsStatusState.current = {
    data: { receipts: [{ transactionHash: TX_HASH }], status: 'success' },
    error: null,
    isError: false,
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('GlassHome integration', () => {
  it('renders the Glass shell, top bar and composer without console errors', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        jsonResponse({ address: USER_ADDRESS, chain: 'base', items: [] }),
      ),
    );

    render(<GlassHome />);
    await flush();

    expect(screen.getByText('sherpa')).toBeTruthy();
    expect(screen.getByLabelText('Intent')).toBeTruthy();
    expect(screen.getByText('Type an intent below to begin.')).toBeTruthy();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('surfaces the disconnected limitation honestly', async () => {
    walletState.address = undefined;
    walletState.isConnected = false;
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse({ items: [] })));

    render(<GlassHome />);
    await flush();

    expect(screen.getByText('Connect Wallet')).toBeTruthy();
    expect(screen.getByText('Connect your wallet to start.')).toBeTruthy();
    expect((screen.getByLabelText('Intent') as HTMLInputElement).disabled).toBe(
      true,
    );
  });

  it('ComposerPill submit triggers the parser; Confirm triggers signing', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === `/api/history/${USER_ADDRESS}?limit=50`) {
        return jsonResponse({ address: USER_ADDRESS, chain: 'base', items: [] });
      }
      if (url === '/api/parse') {
        return jsonResponse({
          parsed: { intent: 'SEND', confidence: 1 },
          card: sendCard(),
        });
      }
      if (url === '/api/execute') {
        return jsonResponse({
          ok: true,
          auditLogId: 7,
          planHash: `0x${'a'.repeat(64)}`,
          card: sendCard(true),
        });
      }
      if (url === '/api/execute/7/confirm') {
        return jsonResponse({ ok: true });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<GlassHome />);
    await flush();

    fireEvent.change(screen.getByLabelText('Intent'), {
      target: { value: `send 5 usdc to ${USER_ADDRESS}` },
    });
    fireEvent.click(screen.getByRole('button', { name: /Preview/ }));
    await flush();

    // Parser was hit and the real confirmation surface rendered.
    expect(fetchMock).toHaveBeenCalledWith('/api/parse', expect.anything());
    expect(
      await screen.findByText(/Confirm in Smart Wallet/),
    ).toBeTruthy();
    expect(screen.getByText('Allowlisted token')).toBeTruthy();
    expect(screen.getByText('Confirm the recipient address.')).toBeTruthy();

    fireEvent.click(screen.getByText(/Confirm in Smart Wallet/));
    await flush();

    expect(fetchMock).toHaveBeenCalledWith('/api/execute', expect.anything());
    expect(sendSponsoredCallsAsync).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Sent 5 USDC')).toBeTruthy();
  });
});
