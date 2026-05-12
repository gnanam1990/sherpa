import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prompt } from './Prompt';

const sendSponsoredCallsAsync = vi.hoisted(() => vi.fn(async () => ({ id: 'calls-id' })));

vi.mock('../../lib/wagmi', () => ({
  useSherpaSendCalls: () => ({ sendSponsoredCallsAsync }),
}));

vi.mock('@sherpa/ui', async () => {
  const actual = await vi.importActual<typeof import('@sherpa/ui')>('@sherpa/ui');
  return {
    ...actual,
    ConfirmationCard: ({ disabled, onConfirm }: { disabled?: boolean; onConfirm?: () => void }) => (
      <button disabled={disabled} type="button" onClick={onConfirm}>
        Confirm mock
      </button>
    ),
  };
});

beforeEach(() => {
  sendSponsoredCallsAsync.mockClear();
  sendSponsoredCallsAsync.mockResolvedValue({ id: 'calls-id' });
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

  it('enables input when wallet is connected', () => {
    render(<Prompt isConnected userAddress="0x036CbD53842c5426634e7929541eC2318f3dCF7e" />);

    expect((screen.getByLabelText('Sherpa prompt') as HTMLInputElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: 'Preview' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it('sends the connected wallet address to parse and execute', async () => {
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => ({
      json: async () =>
        url === '/api/parse'
          ? {
              parsed: { intent: 'SEND', confidence: 1 },
              card: {
                intent: 'SEND',
                primary_action_label: 'Proceed',
                primary_amount_display: 'Send 5 USDC',
                steps: [],
                gas_display: '$0.00 (sponsored)',
                warnings: [],
                estimated_completion_ms: 1000,
              },
            }
          : {
              ok: true,
              auditLogId: 7,
              planHash: `0x${'a'.repeat(64)}`,
              card: {
                intent: 'SEND',
                primary_action_label: 'Proceed',
                primary_amount_display: 'Send 5 USDC',
                steps: [],
                gas_display: '$0.00 (sponsored)',
                warnings: [],
                estimated_completion_ms: 1000,
              },
            },
    }));
    vi.stubGlobal('fetch', fetchMock);

    render(<Prompt isConnected userAddress="0x036CbD53842c5426634e7929541eC2318f3dCF7e" />);

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    await screen.findByText(/parsed: SEND/);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm mock' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const parseInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const executeInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/parse');
    expect(JSON.parse(parseInit.body as string)).toMatchObject({
      userKey: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    });
    expect(fetchMock.mock.calls[1]![0]).toBe('/api/execute');
    expect(JSON.parse(executeInit.body as string)).toMatchObject({
      userAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    });
  });

  it('submits returned EIP-5792 calls through the sponsored wallet hook', async () => {
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => ({
      json: async () =>
        url === '/api/parse'
          ? {
              parsed: { intent: 'SEND', confidence: 1 },
              card: {
                intent: 'SEND',
                primary_action_label: 'Proceed',
                primary_amount_display: 'Send 5 USDC',
                steps: [],
                gas_display: '$0.00 (sponsored)',
                warnings: [],
                estimated_completion_ms: 1000,
              },
            }
          : {
              ok: true,
              auditLogId: 7,
              planHash: `0x${'a'.repeat(64)}`,
              card: {
                intent: 'SEND',
                primary_action_label: 'Proceed',
                primary_amount_display: 'Send 5 USDC',
                steps: [],
                batch: {
                  version: '1.0',
                  chainId: '0x14a34',
                  capabilities: {
                    paymasterService: { url: 'https://api-paymaster.example' },
                  },
                  calls: [
                    {
                      to: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
                      data: '0x1234',
                      value: '0x0',
                    },
                  ],
                },
                gas_display: '$0.00 (sponsored)',
                warnings: [],
                estimated_completion_ms: 1000,
              },
            },
    }));
    vi.stubGlobal('fetch', fetchMock);

    render(<Prompt isConnected userAddress="0x036CbD53842c5426634e7929541eC2318f3dCF7e" />);

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    await screen.findByText(/parsed: SEND/);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm mock' }));

    await waitFor(() => expect(sendSponsoredCallsAsync).toHaveBeenCalledTimes(1));
    expect(sendSponsoredCallsAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        chainId: 84532,
        calls: [
          {
            to: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
            data: '0x1234',
            value: 0n,
          },
        ],
        capabilities: {
          paymasterService: { url: 'https://api-paymaster.example' },
        },
      }),
    );
  });

  it('keeps a parsed card visible but disables confirmation after disconnect', async () => {
    const fetchMock = vi.fn(async () => ({
      json: async () => ({
        parsed: { intent: 'SEND', confidence: 1 },
        card: {
          intent: 'SEND',
          primary_action_label: 'Proceed',
          primary_amount_display: 'Send 5 USDC',
          steps: [],
          gas_display: '$0.00 (sponsored)',
          warnings: [],
          estimated_completion_ms: 1000,
        },
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const { rerender } = render(
      <Prompt isConnected userAddress="0x036CbD53842c5426634e7929541eC2318f3dCF7e" />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    await screen.findByText(/parsed: SEND/);

    rerender(
      <Prompt
        isConnected={false}
        userAddress="0x036CbD53842c5426634e7929541eC2318f3dCF7e"
        disconnectedCopy="Connect wallet to continue"
      />,
    );

    expect(
      (screen.getByRole('button', { name: 'Confirm mock' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('does not submit wallet calls if the wallet disconnects while execute is in flight', async () => {
    let resolveExecute: (value: { json: () => Promise<unknown> }) => void = () => undefined;
    const executeResponse = new Promise<{ json: () => Promise<unknown> }>((resolve) => {
      resolveExecute = resolve;
    });
    const fetchMock = vi.fn((url: string) =>
      url === '/api/parse'
        ? Promise.resolve({
            json: async () => ({
              parsed: { intent: 'SEND', confidence: 1 },
              card: {
                intent: 'SEND',
                primary_action_label: 'Proceed',
                primary_amount_display: 'Send 5 USDC',
                steps: [],
                gas_display: '$0.00 (sponsored)',
                warnings: [],
                estimated_completion_ms: 1000,
              },
            }),
          })
        : executeResponse,
    );
    vi.stubGlobal('fetch', fetchMock);

    const { rerender } = render(
      <Prompt isConnected userAddress="0x036CbD53842c5426634e7929541eC2318f3dCF7e" />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    await screen.findByText(/parsed: SEND/);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm mock' }));

    rerender(
      <Prompt
        isConnected={false}
        userAddress="0x036CbD53842c5426634e7929541eC2318f3dCF7e"
        disconnectedCopy="Connect wallet to continue"
      />,
    );

    resolveExecute({
      json: async () => ({
        ok: true,
        auditLogId: 7,
        planHash: `0x${'a'.repeat(64)}`,
        card: {
          intent: 'SEND',
          primary_action_label: 'Proceed',
          primary_amount_display: 'Send 5 USDC',
          steps: [],
          batch: {
            version: '1.0',
            chainId: '0x14a34',
            calls: [
              {
                to: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
                data: '0x1234',
                value: '0x0',
              },
            ],
          },
          gas_display: '$0.00 (sponsored)',
          warnings: [],
          estimated_completion_ms: 1000,
        },
      }),
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(sendSponsoredCallsAsync).not.toHaveBeenCalled();
  });

  it('does not submit stale wallet calls after reconnecting the same address', async () => {
    let resolveExecute: (value: { json: () => Promise<unknown> }) => void = () => undefined;
    const executeResponse = new Promise<{ json: () => Promise<unknown> }>((resolve) => {
      resolveExecute = resolve;
    });
    const fetchMock = vi.fn((url: string) =>
      url === '/api/parse'
        ? Promise.resolve({
            json: async () => ({
              parsed: { intent: 'SEND', confidence: 1 },
              card: {
                intent: 'SEND',
                primary_action_label: 'Proceed',
                primary_amount_display: 'Send 5 USDC',
                steps: [],
                gas_display: '$0.00 (sponsored)',
                warnings: [],
                estimated_completion_ms: 1000,
              },
            }),
          })
        : executeResponse,
    );
    vi.stubGlobal('fetch', fetchMock);

    const { rerender } = render(
      <Prompt
        connectionEpoch={0}
        isConnected
        userAddress="0x036CbD53842c5426634e7929541eC2318f3dCF7e"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    await screen.findByText(/parsed: SEND/);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm mock' }));

    rerender(
      <Prompt
        connectionEpoch={1}
        isConnected
        userAddress="0x036CbD53842c5426634e7929541eC2318f3dCF7e"
      />,
    );

    resolveExecute({
      json: async () => ({
        ok: true,
        auditLogId: 7,
        planHash: `0x${'a'.repeat(64)}`,
        card: {
          intent: 'SEND',
          primary_action_label: 'Proceed',
          primary_amount_display: 'Send 5 USDC',
          steps: [],
          batch: {
            version: '1.0',
            chainId: '0x14a34',
            calls: [
              {
                to: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
                data: '0x1234',
                value: '0x0',
              },
            ],
          },
          gas_display: '$0.00 (sponsored)',
          warnings: [],
          estimated_completion_ms: 1000,
        },
      }),
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(sendSponsoredCallsAsync).not.toHaveBeenCalled();
  });

  it('shows a failure instead of success when the wallet rejects sendCalls', async () => {
    sendSponsoredCallsAsync.mockRejectedValue(new Error('user rejected'));
    const fetchMock = vi.fn(async (url: string) => ({
      json: async () =>
        url === '/api/parse'
          ? {
              parsed: { intent: 'SEND', confidence: 1 },
              card: {
                intent: 'SEND',
                primary_action_label: 'Proceed',
                primary_amount_display: 'Send 5 USDC',
                steps: [],
                gas_display: '$0.00 (sponsored)',
                warnings: [],
                estimated_completion_ms: 1000,
              },
            }
          : {
              ok: true,
              auditLogId: 7,
              planHash: `0x${'a'.repeat(64)}`,
              card: {
                intent: 'SEND',
                primary_action_label: 'Proceed',
                primary_amount_display: 'Send 5 USDC',
                steps: [],
                batch: {
                  version: '1.0',
                  chainId: '0x14a34',
                  calls: [
                    {
                      to: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
                      data: '0x1234',
                      value: '0x0',
                    },
                  ],
                },
                gas_display: '$0.00 (sponsored)',
                warnings: [],
                estimated_completion_ms: 1000,
              },
            },
    }));
    vi.stubGlobal('fetch', fetchMock);

    render(<Prompt isConnected userAddress="0x036CbD53842c5426634e7929541eC2318f3dCF7e" />);
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    await screen.findByText(/parsed: SEND/);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm mock' }));

    expect(await screen.findByText(/Execute failed: Wallet request failed/)).toBeTruthy();
    expect(screen.queryByText(/audit-log #7/)).toBeNull();
  });
});
