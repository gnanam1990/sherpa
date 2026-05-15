'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChatMessage, MessageContent } from '@sherpa/ui';

export type HistoryItem = {
  txHash: `0x${string}`;
  timestamp: number;
  direction: 'in' | 'out' | 'self';
  counterparty: string;
  asset: string;
  amountDisplay: string;
  sherpaIntent?: string;
};

type HistoryResponse = {
  address?: string;
  chain?: string;
  items?: HistoryItem[];
  error?: string;
};

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

type AddressCache = {
  serverMessages: ChatMessage[];
  sessionMessages: ChatMessage[];
  showLoadOlder: boolean;
};

type UseChatHistoryOptions = {
  fetcher?: Fetcher;
};

const emptyCache: AddressCache = { serverMessages: [], sessionMessages: [], showLoadOlder: false };

function directionVerb(direction: HistoryItem['direction']) {
  if (direction === 'in') return 'Received';
  if (direction === 'self') return 'Moved';
  return 'Sent';
}

function directionSubject(item: HistoryItem) {
  if (item.direction === 'in') return `from ${item.counterparty}`;
  if (item.direction === 'self') return `with ${item.counterparty}`;
  return `to ${item.counterparty}`;
}

function mapHistoryItem(item: HistoryItem): ChatMessage {
  return {
    id: `history-${item.txHash}-${item.timestamp}`,
    role: 'sherpa',
    timestamp: item.timestamp,
    timestampSource: 'server',
    content: {
      kind: 'action',
      summary: {
        action: `${directionVerb(item.direction)} ${item.amountDisplay}`,
        status: 'success',
        subject: directionSubject(item),
        txHash: item.txHash,
      },
    },
  };
}

function sortMessages(messages: ChatMessage[]) {
  return [...messages].sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
}

async function fetchHistory(
  address: string,
  limit: number,
  fetcher: Fetcher,
): Promise<HistoryItem[]> {
  const response = await fetcher(`/api/history/${address}?limit=${limit}`);
  const body = (await response.json()) as HistoryResponse;
  if (!response.ok) throw new Error(body.error ?? `history_${response.status}`);
  return Array.isArray(body.items) ? body.items : [];
}

export function useChatHistory(address?: string, options: UseChatHistoryOptions = {}) {
  const fetcher = options.fetcher ?? fetch;
  const [cache, setCache] = useState<Record<string, AddressCache>>({});
  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    if (cache[address]) return;
    let cancelled = false;
    setIsLoading(true);
    setError(undefined);
    void fetchHistory(address, 50, fetcher)
      .then((items) => {
        if (cancelled) return;
        setCache((current) => ({
          ...current,
          [address]: {
            serverMessages: items.map(mapHistoryItem),
            sessionMessages: current[address]?.sessionMessages ?? [],
            showLoadOlder: items.length >= 50,
          },
        }));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setCache((current) => ({ ...current, [address]: emptyCache }));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [address, cache, fetcher]);

  const currentCache = address ? (cache[address] ?? emptyCache) : emptyCache;
  const messages = useMemo(
    () => sortMessages([...currentCache.serverMessages, ...currentCache.sessionMessages]),
    [currentCache.serverMessages, currentCache.sessionMessages],
  );

  const addMessage = useCallback(
    (message: ChatMessage) => {
      if (!address) return;
      setCache((current) => {
        const existing = current[address] ?? emptyCache;
        return {
          ...current,
          [address]: {
            ...existing,
            sessionMessages: [...existing.sessionMessages, message],
          },
        };
      });
    },
    [address],
  );

  const updateMessage = useCallback(
    (
      messageId: string,
      patch: Partial<Pick<ChatMessage, 'content' | 'timestamp' | 'timestampSource'>>,
    ) => {
      if (!address) return;
      setCache((current) => {
        const existing = current[address] ?? emptyCache;
        const applyPatch = (message: ChatMessage): ChatMessage =>
          message.id === messageId ? { ...message, ...patch } : message;
        return {
          ...current,
          [address]: {
            ...existing,
            serverMessages: existing.serverMessages.map(applyPatch),
            sessionMessages: existing.sessionMessages.map(applyPatch),
          },
        };
      });
    },
    [address],
  );

  const loadOlder = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    setError(undefined);
    try {
      const items = await fetchHistory(address, 200, fetcher);
      setCache((current) => {
        const existing = current[address] ?? emptyCache;
        return {
          ...current,
          [address]: {
            ...existing,
            serverMessages: items.map(mapHistoryItem),
            showLoadOlder: false,
          },
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [address, fetcher]);

  const makeClientMessage = useCallback(
    (role: ChatMessage['role'], content: MessageContent, timestamp = Date.now()): ChatMessage => ({
      id: `${role}-${timestamp}-${Math.random().toString(36).slice(2)}`,
      role,
      timestamp,
      timestampSource: 'client',
      content,
    }),
    [],
  );

  return {
    addMessage,
    error,
    isLoading,
    loadOlder,
    makeClientMessage,
    messages,
    showLoadOlder: currentCache.showLoadOlder,
    updateMessage,
  };
}
