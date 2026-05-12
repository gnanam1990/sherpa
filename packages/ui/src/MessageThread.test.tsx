import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MessageThread } from './MessageThread.js';
import type { ChatMessage } from './MessageBubble.js';

const now = Date.parse('2026-05-12T04:00:00.000Z');

function message(id: string, timestamp: number, text = id): ChatMessage {
  return {
    id,
    role: id.startsWith('u') ? 'user' : 'sherpa',
    timestamp,
    timestampSource: 'client',
    content: { kind: 'text', text },
  };
}

function setScrollMetrics(
  el: HTMLElement,
  metrics: { clientHeight: number; scrollHeight: number },
) {
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: metrics.clientHeight });
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: metrics.scrollHeight });
}

describe('MessageThread', () => {
  it('renders messages in chronological order', () => {
    render(
      <MessageThread
        messages={[message('s2', now + 2000, 'third'), message('u1', now, 'first')]}
        now={now}
      />,
    );

    const first = screen.getByText('first');
    const third = screen.getByText('third');
    expect(first.compareDocumentPosition(third) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders empty state when history is empty', () => {
    render(<MessageThread messages={[]} now={now} />);

    expect(screen.getByText('Type anything to get started')).toBeTruthy();
    expect(screen.getByTestId('sherpa-empty-icon')).toBeTruthy();
  });

  it('renders loading skeleton bubbles while history fetches', () => {
    render(<MessageThread isLoading messages={[]} now={now} />);

    expect(screen.getAllByTestId('message-skeleton')).toHaveLength(3);
  });

  it('auto-scrolls to bottom when already near bottom on new message', () => {
    const { rerender } = render(<MessageThread messages={[message('u1', now)]} now={now} />);
    const thread = screen.getByTestId('message-thread-scroll');
    setScrollMetrics(thread, { clientHeight: 300, scrollHeight: 1000 });
    thread.scrollTop = 700;

    rerender(<MessageThread messages={[message('u1', now), message('s2', now + 1)]} now={now} />);

    expect(thread.scrollTop).toBe(1000);
    expect(screen.queryByRole('button', { name: /new messages/i })).toBeNull();
  });

  it('does not auto-scroll when user has scrolled up by more than 100px', () => {
    const { rerender } = render(<MessageThread messages={[message('u1', now)]} now={now} />);
    const thread = screen.getByTestId('message-thread-scroll');
    setScrollMetrics(thread, { clientHeight: 300, scrollHeight: 1000 });
    thread.scrollTop = 500;
    fireEvent.scroll(thread);

    rerender(<MessageThread messages={[message('u1', now), message('s2', now + 1)]} now={now} />);

    expect(thread.scrollTop).toBe(500);
    expect(screen.getByRole('button', { name: /new messages/i })).toBeTruthy();
  });

  it('jumps to bottom when the new messages pill is tapped', () => {
    const { rerender } = render(<MessageThread messages={[message('u1', now)]} now={now} />);
    const thread = screen.getByTestId('message-thread-scroll');
    setScrollMetrics(thread, { clientHeight: 300, scrollHeight: 1000 });
    thread.scrollTop = 500;
    fireEvent.scroll(thread);
    rerender(<MessageThread messages={[message('u1', now), message('s2', now + 1)]} now={now} />);

    fireEvent.click(screen.getByRole('button', { name: /new messages/i }));

    expect(thread.scrollTop).toBe(1000);
    expect(screen.queryByRole('button', { name: /new messages/i })).toBeNull();
  });

  it('renders and calls Load older messages', () => {
    const onLoadOlder = vi.fn();
    render(
      <MessageThread
        messages={[message('u1', now)]}
        now={now}
        onLoadOlder={onLoadOlder}
        showLoadOlder
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /load older messages/i }));

    expect(onLoadOlder).toHaveBeenCalledTimes(1);
  });
});
