import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmationCard, Shell, type SerializedConfirmationCardProps } from './components.js';

const baseCard: SerializedConfirmationCardProps = {
  intent: 'SEND',
  primary_action_label: 'Proceed',
  primary_amount_display: 'Send 5 USDC',
  secondary_amount_display: '≈ $5.00',
  recipient_display: '0x1234...7890',
  steps: [
    {
      kind: 'transfer',
      to: '0x1234567890123456789012345678901234567890',
      data: '0x',
      value: '0',
      label: 'Transfer USDC',
    },
  ],
  gas_display: '$0.00 (sponsored)',
  warnings: ['New recipient'],
  estimated_completion_ms: 1000,
};

describe('ConfirmationCard', () => {
  it('renders confirmation details and calls onConfirm', () => {
    const onConfirm = vi.fn();
    render(<ConfirmationCard card={baseCard} onConfirm={onConfirm} />);

    expect(screen.getByText('SEND')).toBeTruthy();
    expect(screen.getByText('Send 5 USDC')).toBeTruthy();
    expect(screen.getByText('0x1234...7890')).toBeTruthy();
    expect(screen.getByText('Transfer USDC')).toBeTruthy();
    expect(screen.getByText('New recipient')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Proceed' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('renders redirect cards as links', () => {
    render(
      <ConfirmationCard
        card={{ ...baseCard, steps: [], warnings: [], redirect_url: 'https://example.com/onramp' }}
      />,
    );

    expect(screen.getByTestId('card-redirect')).toHaveAttribute(
      'href',
      'https://example.com/onramp',
    );
  });

  it('disables the confirmation button when requested', () => {
    render(<ConfirmationCard card={baseCard} disabled />);

    expect((screen.getByRole('button', { name: 'Proceed' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('does not render an active redirect link when disabled', () => {
    render(
      <ConfirmationCard
        card={{ ...baseCard, redirect_url: 'https://example.com/onramp' }}
        disabled
      />,
    );

    expect(screen.queryByTestId('card-redirect')).toBeNull();
    expect((screen.getByRole('button', { name: 'Proceed' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});

describe('Shell', () => {
  it('renders children', () => {
    render(<Shell>hello</Shell>);

    expect(screen.getByText('hello')).toBeTruthy();
  });
});
