import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  ConfirmationCard,
  ExecutionFailureCard,
  ExecutionSuccessCard,
  formatExecutionError,
  isUserRejectedExecutionError,
  type SerializedConfirmationCardProps,
} from './ConfirmationCard.js';

const baseStep = {
  kind: 'transfer',
  to: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  data: '0x1234',
  value: '0x0',
  label: 'Transfer 5 USDC to alice.base.eth',
};

function makeCard(
  intent: SerializedConfirmationCardProps['intent'],
): SerializedConfirmationCardProps {
  const common = {
    intent,
    primary_action_label: 'Proceed',
    primary_amount_display: '5 USDC',
    steps: [baseStep],
    gas_display: '$0.00 (sponsored ✓)',
    warnings: [],
    estimated_completion_ms: 4000,
  } satisfies SerializedConfirmationCardProps;

  if (intent === 'SEND') {
    return {
      ...common,
      primary_action_label: 'Send',
      recipient_display: 'alice.base.eth',
      recipient_metadata: { source: 'basename', basename: 'alice.base.eth' },
      risk_indicators: [{ level: 'warning', label: 'New recipient' }],
      batch: {
        version: '1.0',
        chainId: '0x2105',
        calls: [{ to: baseStep.to, data: baseStep.data, value: baseStep.value }],
      },
    };
  }

  if (intent === 'BUY') {
    return {
      ...common,
      primary_action_label: 'Buy',
      primary_amount_display: '$50.00',
      secondary_amount_display: '≈ 0.016 ETH',
      steps: [
        { ...baseStep, kind: 'approve', label: 'Approve 50 USDC for Uniswap' },
        { ...baseStep, kind: 'swap', label: 'Swap 50 USDC → ETH' },
      ],
    };
  }

  if (intent === 'BET') {
    return {
      ...common,
      primary_action_label: 'Place bet',
      secondary_amount_display: 'payout ≈ 2.1x',
      steps: [
        { ...baseStep, kind: 'approve', label: 'Approve 5 USDC for Limitless' },
        { ...baseStep, kind: 'bet', label: 'Bet 5 USDC on YES' },
      ],
      warnings: ['marketId not provided — using placeholder'],
    };
  }

  if (intent === 'BALANCE') {
    return {
      ...common,
      primary_action_label: 'Show balance',
      primary_amount_display: '—',
      steps: [],
      gas_display: 'n/a',
    };
  }

  return {
    ...common,
    primary_action_label: 'Show history',
    primary_amount_display: 'last 5',
    steps: [],
    gas_display: 'n/a',
  };
}

describe('ConfirmationCard', () => {
  it.each(['SEND', 'BUY', 'BET', 'BALANCE', 'HISTORY'] as const)(
    'renders %s confirmation details',
    (intent) => {
      render(<ConfirmationCard card={makeCard(intent)} onConfirm={vi.fn()} onCancel={vi.fn()} />);

      expect(screen.getByTestId('confirmation-card')).toHaveTextContent(intent);
      expect(screen.getByTestId('confirmation-card')).toHaveTextContent(
        makeCard(intent).gas_display,
      );
      expect(screen.getByRole('button', { name: 'Proceed' }).getAttribute('type')).toBe('button');
      expect(screen.getByRole('button', { name: 'Cancel' }).getAttribute('type')).toBe('button');
    },
  );

  it('renders SEND recipient metadata, risk, and Base mainnet state', () => {
    render(<ConfirmationCard card={makeCard('SEND')} onConfirm={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Send 5 USDC' })).toBeTruthy();
    expect(screen.getByText('Base')).toBeTruthy();
    expect(screen.getByText('alice.base.eth')).toBeTruthy();
    expect(screen.getByText('basename')).toBeTruthy();
    expect(screen.getByText('basename: alice.base.eth')).toBeTruthy();
    expect(screen.getByText('New recipient')).toBeTruthy();
  });

  it('renders Base mainnet when the batch targets chain 8453', () => {
    render(
      <ConfirmationCard
        card={{
          ...makeCard('BUY'),
          batch: {
            version: '1.0',
            chainId: '0x2105',
            calls: [{ to: baseStep.to, data: baseStep.data, value: baseStep.value }],
          },
          gas_display: 'user pays',
        }}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText('Base')).toBeTruthy();
    expect(screen.queryByText('Base Sepolia')).toBeNull();
  });

  it('renders all multi-step plan rows without collapse', () => {
    render(<ConfirmationCard card={makeCard('BUY')} onConfirm={vi.fn()} onCancel={vi.fn()} />);

    const steps = screen.getAllByTestId('card-step');
    expect(steps).toHaveLength(2);
    expect(within(steps[0]!).getByText('Approve 50 USDC for Uniswap')).toBeTruthy();
    expect(within(steps[1]!).getByText('Swap 50 USDC → ETH')).toBeTruthy();
    expect(screen.getByText('2-step plan')).toBeTruthy();
  });

  it('calls Proceed and Cancel handlers', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmationCard card={makeCard('SEND')} onConfirm={onConfirm} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: 'Proceed' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders the compact 375px mobile card essentials', () => {
    const { container } = render(
      <div style={{ width: 375 }}>
        <ConfirmationCard card={makeCard('BET')} onConfirm={vi.fn()} onCancel={vi.fn()} />
      </div>,
    );

    expect(container.firstChild).toHaveStyle({ width: '375px' });
    expect(screen.getByTestId('confirmation-card')).toHaveTextContent('BET');
    expect(screen.getByTestId('confirmation-card')).toHaveTextContent('Sponsored');
    expect(screen.getByTestId('confirmation-card')).toHaveTextContent('2-step plan');
    expect(screen.getByRole('button', { name: 'Proceed' })).toBeTruthy();
  });
});

describe('execution result cards', () => {
  it('renders success with basescan link and Send another CTA', () => {
    const onSendAnother = vi.fn();
    const txHash = `0x${'a'.repeat(64)}`;
    render(
      <ExecutionSuccessCard
        actionDescription="Send 5 USDC"
        txHash={txHash}
        onSendAnother={onSendAnother}
      />,
    );

    expect(screen.getByRole('link', { name: /view on basescan/i }).getAttribute('href')).toBe(
      `https://basescan.org/tx/${txHash}`,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Send another' }));
    expect(onSendAnother).toHaveBeenCalledTimes(1);
  });

  it('renders failure with translated error and recovery CTAs', () => {
    const onTryAgain = vi.fn();
    const onEditAndRetry = vi.fn();
    const onSendAnother = vi.fn();
    render(
      <ExecutionFailureCard
        actionDescription="Send 5 USDC"
        errorDetail="SIMULATION_FAILED"
        onTryAgain={onTryAgain}
        onEditAndRetry={onEditAndRetry}
        onSendAnother={onSendAnother}
      />,
    );

    expect(
      screen.getByText('Transaction would fail. Try a smaller amount or different recipient.'),
    ).toBeTruthy();
    expect(screen.getByText('We tried to: Send 5 USDC')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit and retry' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send another' }));

    expect(onTryAgain).toHaveBeenCalledTimes(1);
    expect(onEditAndRetry).toHaveBeenCalledTimes(1);
    expect(onSendAnother).toHaveBeenCalledTimes(1);
  });

  it('maps known execution errors to plain English', () => {
    const rejectedError =
      'User rejected the request. Request Arguments: chain: undefined (id: 84532) Details: User cancelled transaction Version: viem@2.48.4';

    expect(formatExecutionError('INSUFFICIENT_FUNDS_FOR_GAS')).toBe('Not enough ETH for gas');
    expect(formatExecutionError('RECIPIENT_INVALID')).toBe(
      "Recipient address couldn't be resolved",
    );
    expect(formatExecutionError('TIMEOUT')).toBe(
      'Transaction took too long. Check basescan with the tx hash.',
    );
    expect(isUserRejectedExecutionError(rejectedError)).toBe(true);
    expect(formatExecutionError(rejectedError)).toBe('Wallet request was cancelled.');
    expect(formatExecutionError('RAW_PROVIDER_ERROR')).toBe('RAW_PROVIDER_ERROR');
  });
});
