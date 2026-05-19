import React, { useRef, useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { ActionRail } from '../action-rail';

vi.mock('sonner', () => ({
  toast: vi.fn(),
}));

function Harness({ initial = '' }: { initial?: string }) {
  const [draft, setDraft] = useState(initial);
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div>
      <ActionRail draft={draft} inputRef={inputRef} onPrefill={setDraft} />
      <input
        aria-label="Intent"
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
    </div>
  );
}

beforeEach(() => {
  vi.mocked(toast).mockClear();
});

describe('ActionRail', () => {
  it('renders exactly 6 chips and keeps Bridge out of the rail', () => {
    render(<Harness />);

    const railButtons = screen
      .getAllByRole('button')
      .filter((button) =>
        ['Swap', 'Send', 'Lend', 'Borrow', 'Withdraw', 'More'].includes(
          button.getAttribute('aria-label') ?? '',
        ),
      );

    expect(railButtons).toHaveLength(6);
    expect(railButtons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Swap',
      'Send',
      'Lend',
      'Borrow',
      'Withdraw',
      'More',
    ]);
    expect(screen.queryByRole('button', { name: 'Bridge' })).toBeNull();
  });

  it.each([
    ['Swap', 'swap '],
    ['Send', 'send '],
    ['Lend', 'lend '],
    ['Borrow', 'borrow '],
    ['Withdraw', 'withdraw '],
  ])(
    'prefills %s with the correct verb, focuses input, and does not submit',
    async (label, prefill) => {
      render(<Harness />);

      fireEvent.click(screen.getByRole('button', { name: label }));

      const input = screen.getByLabelText('Intent') as HTMLInputElement;
      expect(input).toHaveValue(prefill);
      expect(input).toHaveFocus();
      await waitFor(() => expect(input.selectionStart).toBe(prefill.length));
    },
  );

  it('opens More and keeps Bridge under DeFi', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'More' }));

    const sheet = screen.getByRole('dialog', { name: 'More intents' });
    expect(sheet).toBeTruthy();
    const defi = screen.getByText('DeFi').parentElement;
    expect(defi).not.toBeNull();
    expect(within(defi as HTMLElement).getByRole('button', { name: 'Bridge' })).toBeTruthy();
  });

  it('sheet items prefill and close the sheet', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'More' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bridge' }));

    expect(screen.getByLabelText('Intent')).toHaveValue('bridge ');
    expect(screen.queryByRole('dialog', { name: 'More intents' })).toBeNull();
  });

  it('replacing draft text shows the toast', () => {
    render(<Harness initial="send 1 usdc" />);

    fireEvent.click(screen.getByRole('button', { name: 'Swap' }));

    expect(screen.getByLabelText('Intent')).toHaveValue('swap ');
    expect(toast).toHaveBeenCalledWith('Replaced draft');
  });
});
