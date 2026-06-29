'use client';


/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
const STORAGE_PREFIX = 'sherpa.chatHistory.v1:';
const SESSION_MESSAGE_LIMIT = 100;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!isRecord(value)) return false;
  if (value.role !== 'user' && value.role !== 'sherpa') return false;
  if (typeof value.id !== 'string' || typeof value.timestamp !== 'number') return false;
  if (value.timestampSource !== 'server' && value.timestampSource !== 'client') return false;
  if (!isRecord(value.content) || typeof value.content.kind !== 'string') return false;
  return true;
}

function storageKey(address: string) {
  return `${STORAGE_PREFIX}${address.toLowerCase()}`;
}

function readStoredSessionMessages(address: string): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey(address));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isChatMessage).slice(-SESSION_MESSAGE_LIMIT);
  } catch {
    return [];
  }
}

function writeStoredSessionMessages(address: string, messages: ChatMessage[]) {
  if (typeof window === 'undefined') return;
  const persistable = messages
    .filter((message) => message.content.kind !== 'thinking')
    .slice(-SESSION_MESSAGE_LIMIT);
  try {
    if (persistable.length === 0) {
      window.localStorage.removeItem(storageKey(address));
      return;
    }
    window.localStorage.setItem(storageKey(address), JSON.stringify(persistable));
  } catch {
    // Browser storage is a convenience; history still works from the API.
  }
}

function txHashForMessage(message: ChatMessage): string | undefined {
  if (message.content.kind !== 'action') return undefined;
  const txHash = message.content.summary.txHash;
  return typeof txHash === 'string' ? txHash.toLowerCase() : undefined;
}

function sortMessages(messages: ChatMessage[]) {
  return [...messages].sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
}

function mergeMessages(serverMessages: ChatMessage[], sessionMessages: ChatMessage[]) {
  const serverTxHashes = new Set(serverMessages.map(txHashForMessage).filter(Boolean));
  const dedupedSessionMessages = sessionMessages.filter((message) => {
    const txHash = txHashForMessage(message);
    return !txHash || !serverTxHashes.has(txHash);
  });
  return sortMessages([...serverMessages, ...dedupedSessionMessages]);
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
  const loadedAddresses = useRef(new Set<string>());

  useEffect(() => {
    if (!address) return;
    const loadedKey = address.toLowerCase();
    if (loadedAddresses.current.has(loadedKey)) return;
    loadedAddresses.current.add(loadedKey);
    const storedSessionMessages = readStoredSessionMessages(address);
    if (storedSessionMessages.length > 0) {
      setCache((current) => {
        if (current[address]) return current;
        return {
          ...current,
          [address]: { ...emptyCache, sessionMessages: storedSessionMessages },
        };
      });
    }
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
            sessionMessages: current[address]?.sessionMessages ?? storedSessionMessages,
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
  }, [address, fetcher]);

  const currentCache = address ? (cache[address] ?? emptyCache) : emptyCache;
  useEffect(() => {
    if (!address || !cache[address]) return;
    writeStoredSessionMessages(address, cache[address].sessionMessages);
  }, [address, cache]);

  const messages = useMemo(
    () => mergeMessages(currentCache.serverMessages, currentCache.sessionMessages),
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
