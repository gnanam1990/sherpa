import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PositionsView, formatUsdBase } from './PositionsView';

const ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;

const wagmiState = vi.hoisted(() => ({
  current: {
    address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}` | undefined,
    isConnected: true,
  },
}));

vi.mock('wagmi', () => ({
  useAccount: () => wagmiState.current,
}));

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

function position(overrides: Partial<Record<string, string | boolean>> = {}) {
  return {
    address: ADDRESS,
    chain: 'base',
    pool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
    totalCollateralBase: '1234567890',
    totalDebtBase: '250000000',
    availableBorrowsBase: '500000000',
    currentLiquidationThreshold: '8250',
    ltv: '7800',
    healthFactor: '3300000000000000000',
    hasPosition: true,
    fetchedAt: '2026-05-16T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  wagmiState.current = { address: ADDRESS, isConnected: true };
  vi.unstubAllGlobals();
});

describe('PositionsView', () => {
  it('formats Aave USD base values without Number conversion', () => {
    expect(formatUsdBase('1234567890')).toBe('$12.34');
    expect(formatUsdBase('1')).toBe('$0.00');
    expect(formatUsdBase('100000000')).toBe('$1.00');
  });

  it('loads and renders a position', async () => {
    const fetchMock = vi.fn(() => jsonResponse(position()));
    vi.stubGlobal('fetch', fetchMock);

    render(<PositionsView />);

    expect(await screen.findByText('Your Aave V3 Position')).toBeTruthy();
    expect(screen.getByText('$12.34')).toBeTruthy();
    expect(screen.getByText('$2.50')).toBeTruthy();
    expect(screen.getByText('$5.00')).toBeTruthy();
    expect(screen.getByText('HF 3.30 · Safe')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(`/api/positions/${ADDRESS}`);
  });

  it('renders an empty state when the wallet has no position', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse(position({ hasPosition: false }))));

    render(<PositionsView />);

    expect(await screen.findByText('No Aave positions')).toBeTruthy();
    expect(screen.getByText(/no supplied collateral/i)).toBeTruthy();
  });

  it('asks users to connect when disconnected', () => {
    wagmiState.current = { address: undefined, isConnected: false };

    render(<PositionsView />);

    expect(screen.getByText('Connect your wallet to view Aave positions.')).toBeTruthy();
  });

  it('shows retry after API failures', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse({ error: 'aave_query_failed', details: 'rpc unavailable' }, 500)));

    render(<PositionsView />);

    expect(await screen.findByText('Error: rpc unavailable')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });

  it('refreshes positions when the refresh button is clicked', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse(position({ totalCollateralBase: '100000000' })))
      .mockImplementationOnce(() => jsonResponse(position({ totalCollateralBase: '200000000' })));
    vi.stubGlobal('fetch', fetchMock);

    render(<PositionsView />);

    expect(await screen.findByText('$1.00')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(screen.getByText('$2.00')).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
