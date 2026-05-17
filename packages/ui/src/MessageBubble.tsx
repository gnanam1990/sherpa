'use client';

import { useState } from 'react';
import { ConfirmationCard, type SerializedConfirmationCardProps } from './ConfirmationCard.js';

export type MessageRole = 'user' | 'sherpa';
export type TimestampSource = 'server' | 'client';
export type ActionStatus = 'success' | 'failed' | 'pending';

export type ActionSummary = {
  action: string;
  subject?: string;
  status: ActionStatus;
  txHash?: `0x${string}` | string;
  error?: string;
};

export type MessageContent =
  | { kind: 'text'; text: string }
  | { kind: 'thinking' }
  | { kind: 'confirmation'; card: SerializedConfirmationCardProps; sourceInput: string }
  | { kind: 'action'; summary: ActionSummary; card?: SerializedConfirmationCardProps };

export type ChatMessage = {
  id: string;
  role: MessageRole;
  timestamp: number;
  timestampSource: TimestampSource;
  content: MessageContent;
};

type MessageBubbleProps = {
  message: ChatMessage;
  now?: number;
  onCancelConfirmation?: (messageId: string) => void;
  onConfirmMessage?: (messageId: string) => void;
};

const EXPLORER_TX_PREFIX: Record<string, string> = {
  '0x2105': 'https://basescan.org/tx/',
  '8453': 'https://basescan.org/tx/',
  '0x14a34': 'https://sepolia.basescan.org/tx/',
  '84532': 'https://sepolia.basescan.org/tx/',
};

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function relativeTime(timestamp: number, now = Date.now()): string {
  const diffMs = Math.max(0, now - timestamp);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  if (hours < 48) return 'yesterday';
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function statusIcon(status: ActionStatus): string {
  if (status === 'success') return '✓';
  if (status === 'failed') return '✗';
  return '⋯';
}

function bubbleSurfaceClass(message: ChatMessage): string {
  if (message.role === 'user') return 'bg-sherpa-blue text-white';
  return 'border border-sherpa-surface2 bg-sherpa-surface text-sherpa-fg';
}

function ThinkingDots() {
  const delays = ['', 'delay-150', 'delay-300'];
  return (
    <div aria-label="Sherpa is thinking" className="flex items-center gap-1.5">
      {[0, 1, 2].map((index) => (
        <span
          className={`h-2 w-2 animate-pulse rounded-full bg-sherpa-muted ${delays[index] ?? ''}`}
          data-testid="thinking-dot"
          key={index}
        />
      ))}
    </div>
  );
}

function ActionSummaryView({
  card,
  summary,
}: {
  card?: SerializedConfirmationCardProps;
  summary: ActionSummary;
}) {
  const [expanded, setExpanded] = useState(false);
  const explorerPrefix =
    (card?.batch?.chainId && EXPLORER_TX_PREFIX[card.batch.chainId.toLowerCase()]) ??
    EXPLORER_TX_PREFIX['0x14a34']!;
  const txHref = summary.txHash ? `${explorerPrefix}${summary.txHash}` : undefined;
  const compactContent = (
    <>
      <span className="min-w-0">
        <span className="font-semibold text-sherpa-fg">{summary.action}</span>{' '}
        {summary.subject ? <span className="text-sherpa-muted">{summary.subject}</span> : null}
      </span>
      <span className="flex items-center gap-2 text-sherpa-muted">
        <span aria-label={summary.status}>{statusIcon(summary.status)}</span>
        {card ? (
          <span aria-hidden="true" className={expanded ? 'rotate-180' : ''}>
            ˅
          </span>
        ) : null}
      </span>
    </>
  );
  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        {card ? (
          <button
            aria-expanded={expanded}
            className="flex min-h-11 flex-1 items-center justify-between gap-3 rounded-xl border border-sherpa-surface2 bg-sherpa-bg px-3 py-2 text-left text-sm transition hover:border-sherpa-muted focus:outline-none focus:ring-2 focus:ring-sherpa-blue/50"
            onClick={() => setExpanded((value) => !value)}
            type="button"
          >
            {compactContent}
          </button>
        ) : (
          <div className="flex min-h-11 flex-1 items-center justify-between gap-3 rounded-xl border border-sherpa-surface2 bg-sherpa-bg px-3 py-2 text-left text-sm">
            {compactContent}
          </div>
        )}
        {txHref ? (
          <a
            aria-label="View on Basescan"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-sherpa-surface2 bg-sherpa-bg text-sm text-sherpa-muted transition hover:border-sherpa-muted hover:text-sherpa-fg focus:outline-none focus:ring-2 focus:ring-sherpa-blue/50"
            href={txHref}
            rel="noreferrer noopener"
            target="_blank"
          >
            ↗
          </a>
        ) : null}
      </div>
      {summary.error ? <p className="mt-2 text-xs text-sherpa-danger">{summary.error}</p> : null}
      {expanded && card ? (
        <div className="mt-3 overflow-hidden transition-[max-height,opacity] duration-200">
          <ConfirmationCard card={card} disabled />
        </div>
      ) : null}
    </div>
  );
}

export function MessageBubble({
  message,
  now,
  onCancelConfirmation,
  onConfirmMessage,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  return (
    <article
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
      data-testid={`message-bubble-${message.role}`}
    >
      <div
        className={cx(
          'max-w-[88%] rounded-2xl px-3 py-2 shadow-sm',
          message.content.kind === 'thinking' && 'min-h-10',
          bubbleSurfaceClass(message),
        )}
        data-testid="message-bubble-surface"
      >
        <div className="mb-1 text-[11px] text-current opacity-70">
          {relativeTime(message.timestamp, now)}
        </div>
        {message.content.kind === 'text' ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-5">
            {message.content.text}
          </p>
        ) : null}
        {message.content.kind === 'thinking' ? (
          <div className="flex min-h-10 items-center">
            <ThinkingDots />
          </div>
        ) : null}
        {message.content.kind === 'confirmation' ? (
          <ConfirmationCard
            card={message.content.card}
            onCancel={() => onCancelConfirmation?.(message.id)}
            onConfirm={() => onConfirmMessage?.(message.id)}
          />
        ) : null}
        {message.content.kind === 'action' ? (
          <ActionSummaryView card={message.content.card} summary={message.content.summary} />
        ) : null}
      </div>
    </article>
  );
}

export { relativeTime as formatRelativeMessageTime };
