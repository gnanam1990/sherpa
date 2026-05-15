import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useChatHistory, type HistoryItem } from './useChatHistory';

const ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const OTHER_ADDRESS = '0x1111111111111111111111111111111111111111';
const now = Date.parse('2026-05-12T04:00:00.000Z');

function response(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

function item(txHash: string, timestamp = now): HistoryItem {
  return {
    txHash: txHash as `0x${string}`,
    timestamp,
    direction: 'out',
    counterparty: OTHER_ADDRESS as `0x${string}`,
    asset: 'USDC',
    amountDisplay: '5 USDC',
    sherpaIntent: 'SEND',
  };
}

afterEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe('useChatHistory', () => {
  it('fetches /api/history/:address?limit=50 and maps HistoryItem[] to action messages', async () => {
    const fetcher = vi.fn(async (url: string) => {
      expect(url).toBe(`/api/history/${ADDRESS}?limit=50`);
      return response({
        address: ADDRESS,
        chain: 'base-sepolia',
        items: [item(`0x${'a'.repeat(64)}`)],
      });
    });

    const { result } = renderHook(() => useChatHistory(ADDRESS, { fetcher }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toMatchObject({
      role: 'sherpa',
      timestamp: now,
      timestampSource: 'server',
      content: {
        kind: 'action',
        summary: { action: 'Sent 5 USDC', subject: `to ${OTHER_ADDRESS}`, status: 'success' },
      },
    });
    expect(result.current.showLoadOlder).toBe(false);
  });

  it('shows Load older when initial response has 50 items and fetches limit 200 on demand', async () => {
    const fifty = Array.from({ length: 50 }, (_, index) =>
      item(`0x${String(index).padStart(64, '0')}`, now + index),
    );
    const twoHundred = Array.from({ length: 60 }, (_, index) =>
      item(`0x${String(index + 100).padStart(64, '0')}`, now + index),
    );
    const fetcher = vi.fn((url: string) =>
      response({
        address: ADDRESS,
        chain: 'base-sepolia',
        items: url.endsWith('limit=50') ? fifty : twoHundred,
      }),
    );

    const { result } = renderHook(() => useChatHistory(ADDRESS, { fetcher }));
    await waitFor(() => expect(result.current.showLoadOlder).toBe(true));

    await act(async () => result.current.loadOlder());

    expect(fetcher).toHaveBeenLastCalledWith(`/api/history/${ADDRESS}?limit=200`);
    expect(result.current.messages).toHaveLength(60);
  });

  it('appends and updates in-session messages in memory without POSTing', async () => {
    const fetcher = vi.fn(async () =>
      response({ address: ADDRESS, chain: 'base-sepolia', items: [] }),
    );
    const { result } = renderHook(() => useChatHistory(ADDRESS, { fetcher }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addMessage({
        id: 'client-1',
        role: 'user',
        timestamp: now + 1,
        timestampSource: 'client',
        content: { kind: 'text', text: 'send 5 usdc' },
      });
    });
    act(() => {
      result.current.updateMessage('client-1', {
        content: { kind: 'text', text: 'send 10 usdc' },
      });
    });

    expect(result.current.messages[0]).toMatchObject({
      id: 'client-1',
      timestampSource: 'client',
      content: { kind: 'text', text: 'send 10 usdc' },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('restores in-browser session messages after remount', async () => {
    const fetcher = vi.fn(async () =>
      response({ address: ADDRESS, chain: 'base-sepolia', items: [] }),
    );
    const first = renderHook(() => useChatHistory(ADDRESS, { fetcher }));
    await waitFor(() => expect(first.result.current.isLoading).toBe(false));

    act(() => {
      first.result.current.addMessage({
        id: 'client-reload-1',
        role: 'user',
        timestamp: now + 1,
        timestampSource: 'client',
        content: { kind: 'text', text: 'show my history' },
      });
    });
    await waitFor(() =>
      expect(window.localStorage.getItem(`sherpa.chatHistory.v1:${ADDRESS.toLowerCase()}`)).toContain(
        'show my history',
      ),
    );
    first.unmount();

    const second = renderHook(() => useChatHistory(ADDRESS, { fetcher }));
    await waitFor(() =>
      expect(second.result.current.messages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'client-reload-1',
            content: { kind: 'text', text: 'show my history' },
          }),
        ]),
      ),
    );
  });

  it('does not duplicate a persisted session action when server history has the same tx', async () => {
    const txHash = `0x${'d'.repeat(64)}`;
    window.localStorage.setItem(
      `sherpa.chatHistory.v1:${ADDRESS.toLowerCase()}`,
      JSON.stringify([
        {
          id: 'client-action-1',
          role: 'sherpa',
          timestamp: now - 1,
          timestampSource: 'client',
          content: {
            kind: 'action',
            summary: {
              action: 'Sent 5 USDC',
              status: 'success',
              subject: `to ${OTHER_ADDRESS}`,
              txHash,
            },
          },
        },
      ]),
    );
    const fetcher = vi.fn(async () =>
      response({
        address: ADDRESS,
        chain: 'base-sepolia',
        items: [item(txHash, now)],
      }),
    );

    const { result } = renderHook(() => useChatHistory(ADDRESS, { fetcher }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(
      result.current.messages.filter(
        (message) =>
          message.content.kind === 'action' && message.content.summary.txHash === txHash,
      ),
    ).toHaveLength(1);
    expect(result.current.messages[0]?.id).toBe(`history-${txHash}-${now}`);
  });

  it('caches per-address history while mounted', async () => {
    const fetcher = vi.fn(async (url: string) =>
      response({
        address: url.includes(OTHER_ADDRESS) ? OTHER_ADDRESS : ADDRESS,
        chain: 'base-sepolia',
        items: [],
      }),
    );
    const { rerender, result } = renderHook(({ address }) => useChatHistory(address, { fetcher }), {
      initialProps: { address: ADDRESS },
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    rerender({ address: OTHER_ADDRESS });
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    rerender({ address: ADDRESS });

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('returns an error state when history fetch fails', async () => {
    const fetcher = vi.fn(async () => response({ error: 'indexer_error' }, 502));
    const { result } = renderHook(() => useChatHistory(ADDRESS, { fetcher }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('indexer_error');
    expect(result.current.messages).toEqual([]);
  });
});
