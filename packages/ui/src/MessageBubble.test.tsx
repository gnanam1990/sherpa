import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MessageBubble, type ChatMessage } from './MessageBubble.js';

const now = Date.parse('2026-05-12T04:00:00.000Z');
const txHash = `0x${'a'.repeat(64)}`;

function userMessage(): ChatMessage {
  return {
    id: 'user-1',
    role: 'user',
    timestamp: now - 2 * 60_000,
    timestampSource: 'client',
    content: { kind: 'text', text: 'send 5 usdc to vitalik.base.eth' },
  };
}

function sherpaText(): ChatMessage {
  return {
    id: 'sherpa-1',
    role: 'sherpa',
    timestamp: now - 24 * 60 * 60_000,
    timestampSource: 'server',
    content: { kind: 'text', text: 'Ready to send.' },
  };
}

function actionMessage(): ChatMessage {
  return {
    id: 'action-1',
    role: 'sherpa',
    timestamp: now,
    timestampSource: 'server',
    content: {
      kind: 'action',
      summary: {
        action: 'Sent 5 USDC',
        subject: 'to vitalik.base.eth',
        status: 'success',
        txHash,
      },
      card: {
        intent: 'SEND',
        primary_action_label: 'Send',
        primary_amount_display: '5 USDC',
        recipient_display: 'vitalik.base.eth',
        steps: [],
        gas_display: '$0.00 (sponsored ✓)',
        warnings: [],
        estimated_completion_ms: 4000,
      },
    },
  };
}

function historyActionMessage(): ChatMessage {
  return {
    ...actionMessage(),
    id: 'history-action-1',
    content: {
      kind: 'action',
      summary: {
        action: 'Sent 5 USDC',
        subject: 'to vitalik.base.eth',
        status: 'success',
        txHash,
      },
    },
  };
}

describe('MessageBubble', () => {
  it('renders user messages right-aligned with Base blue styling', () => {
    render(<MessageBubble message={userMessage()} now={now} />);

    const bubble = screen.getByTestId('message-bubble-user');
    expect(bubble.className).toContain('justify-end');
    expect(within(bubble).getByText('send 5 usdc to vitalik.base.eth')).toBeTruthy();
    expect(within(bubble).getByText('2 min ago')).toBeTruthy();
    expect(within(bubble).getByTestId('message-bubble-surface').className).toContain(
      'bg-sherpa-blue',
    );
  });

  it('renders sherpa messages left-aligned with dark gray styling', () => {
    render(<MessageBubble message={sherpaText()} now={now} />);

    const bubble = screen.getByTestId('message-bubble-sherpa');
    expect(bubble.className).toContain('justify-start');
    expect(within(bubble).getByText('Ready to send.')).toBeTruthy();
    expect(within(bubble).getByText('yesterday')).toBeTruthy();
    expect(within(bubble).getByTestId('message-bubble-surface').className).toContain(
      'bg-sherpa-surface',
    );
  });

  it('renders a compact action summary with independent basescan link', () => {
    render(<MessageBubble message={actionMessage()} now={now} />);

    const button = screen.getByRole('button', { name: /sent 5 usdc/i });
    expect(button.className).toContain('min-h-11');
    expect(screen.getByText('Sent 5 USDC')).toBeTruthy();
    expect(screen.getByText('to vitalik.base.eth')).toBeTruthy();
    expect(screen.getByText('✓')).toBeTruthy();
    expect(screen.getByRole('link', { name: /view on basescan/i }).getAttribute('href')).toBe(
      `https://sepolia.basescan.org/tx/${txHash}`,
    );
  });

  it('expands a compact action summary inline with the full ConfirmationCard', () => {
    render(<MessageBubble message={actionMessage()} now={now} />);

    expect(screen.queryByTestId('confirmation-card')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /sent 5 usdc/i }));

    expect(screen.getByTestId('confirmation-card')).toBeTruthy();
    expect(screen.getByText('vitalik.base.eth')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /sent 5 usdc/i }));
    expect(screen.queryByTestId('confirmation-card')).toBeNull();
  });

  it('does not show an expand affordance for history summaries without a card', () => {
    render(<MessageBubble message={historyActionMessage()} now={now} />);

    expect(screen.queryByRole('button', { name: /sent 5 usdc/i })).toBeNull();
    expect(screen.getByText('Sent 5 USDC')).toBeTruthy();
    expect(screen.queryByTestId('confirmation-card')).toBeNull();
  });

  it('renders a compact 40px thinking bubble with animated dots', () => {
    render(
      <MessageBubble
        message={{
          id: 'thinking-1',
          role: 'sherpa',
          timestamp: now,
          timestampSource: 'client',
          content: { kind: 'thinking' },
        }}
        now={now}
      />,
    );

    expect(screen.getByLabelText('Sherpa is thinking')).toBeTruthy();
    expect(screen.getAllByTestId('thinking-dot')).toHaveLength(3);
    expect(screen.getByTestId('message-bubble-surface').className).toContain('min-h-10');
  });

  it('renders the mobile action summary essentials at 375px', () => {
    const { container } = render(
      <div className="w-[375px]">
        <MessageBubble message={actionMessage()} now={now} />
      </div>,
    );

    expect(container.firstChild).toHaveClass('w-[375px]');
    expect(screen.getByTestId('message-bubble-surface')).toHaveTextContent('Sent 5 USDC');
    expect(screen.getByRole('button', { name: /Sent 5 USDC/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});
