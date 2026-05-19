/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageBubble, type ChatMessage } from './MessageBubble.js';

type MessageThreadProps = {
  messages: ChatMessage[];
  isLoading?: boolean;
  now?: number;
  onCancelConfirmation?: (messageId: string) => void;
  onConfirmMessage?: (messageId: string) => void;
  onLoadOlder?: () => void;
  showLoadOlder?: boolean;
};

function LoadingSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[0, 1, 2].map((index) => (
        <div
          className="h-12 w-2/3 animate-pulse rounded-2xl bg-sherpa-surface2"
          data-testid="message-skeleton"
          key={index}
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full min-h-60 flex-col items-center justify-center gap-3 text-center text-sherpa-muted">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sherpa-surface2 bg-sherpa-surface text-xl font-semibold text-sherpa-blue"
        data-testid="sherpa-empty-icon"
      >
        S
      </div>
      <p className="text-sm">Type anything to get started</p>
    </div>
  );
}

export function MessageThread({
  isLoading = false,
  messages,
  now,
  onCancelConfirmation,
  onConfirmMessage,
  onLoadOlder,
  showLoadOlder = false,
}: MessageThreadProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastCountRef = useRef(messages.length);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id)),
    [messages],
  );
  const showSkeleton = isLoading && sortedMessages.length === 0;

  const jumpToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setIsNearBottom(true);
    setHasNewMessages(false);
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom <= 100;
    setIsNearBottom(nearBottom);
    if (nearBottom) setHasNewMessages(false);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const countIncreased = messages.length > lastCountRef.current;
    lastCountRef.current = messages.length;
    if (!countIncreased) return;
    if (isNearBottom) {
      el.scrollTop = el.scrollHeight;
      setHasNewMessages(false);
    } else {
      setHasNewMessages(true);
    }
  }, [isNearBottom, messages.length]);

  return (
    <section className="relative flex min-h-0 flex-1 flex-col rounded-2xl border border-sherpa-surface2 bg-sherpa-bg/60">
      <div
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3"
        data-testid="message-thread-scroll"
        onScroll={handleScroll}
        ref={scrollRef}
      >
        {showLoadOlder ? (
          <button
            className="mx-auto min-h-11 rounded-full border border-sherpa-surface2 px-4 py-2 text-xs font-medium text-sherpa-muted transition hover:border-sherpa-muted hover:text-sherpa-fg focus:outline-none focus:ring-2 focus:ring-sherpa-blue/50"
            onClick={onLoadOlder}
            type="button"
          >
            Load older messages
          </button>
        ) : null}
        {showSkeleton ? <LoadingSkeleton /> : null}
        {!isLoading && sortedMessages.length === 0 ? <EmptyState /> : null}
        {sortedMessages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            now={now}
            onCancelConfirmation={onCancelConfirmation}
            onConfirmMessage={onConfirmMessage}
          />
        ))}
      </div>
      {hasNewMessages ? (
        <button
          className="absolute bottom-3 left-1/2 min-h-11 -translate-x-1/2 rounded-full bg-sherpa-blue px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-black/30 focus:outline-none focus:ring-2 focus:ring-sherpa-blue/50"
          onClick={jumpToBottom}
          type="button"
        >
          ↓ New messages
        </button>
      ) : null}
    </section>
  );
}
