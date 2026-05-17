import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GovernanceActionsPanel,
  SessionKeyPanel,
  StrategyMarketplacePanel,
} from './AdvancedPanels';

const wagmiState = vi.hoisted(() => ({
  address: '0x1234567890123456789012345678901234567890' as `0x${string}` | undefined,
  isConnected: true,
}));

vi.mock('wagmi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wagmi')>();
  return {
    ...actual,
    useAccount: () => ({
      address: wagmiState.address,
      isConnected: wagmiState.isConnected,
    }),
  };
});

function mockFetch() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === '/api/strategies') {
      return Response.json({
        strategies: [
          {
            id: 'dca-eth-weekly',
            name: 'Weekly ETH DCA',
            description: 'Recurring USDC to ETH strategy.',
            executionEnabled: false,
            followers: 3,
            source: 'catalog',
            tags: ['dca', 'eth'],
          },
        ],
      });
    }
    if (url === '/api/strategies/dca-eth-weekly/follow' && init?.method === 'POST') {
      return Response.json({ following: true, strategy: { id: 'dca-eth-weekly' } });
    }
    if (url.startsWith('/api/session-keys/') && (!init || init.method === undefined)) {
      return Response.json({ sessionKeys: [] });
    }
    if (url === '/api/session-keys' && init?.method === 'POST') {
      return Response.json(
        {
          id: 'sk-1',
          sessionKeyAddress: '0x3333333333333333333333333333333333333333',
          chainId: 8453,
          spendLimit: '100000000',
          spentAmount: '0',
          validUntil: new Date(Date.now() + 86_400_000).toISOString(),
          status: 'active',
          executionCount: 0,
        },
        { status: 201 },
      );
    }
    if (url === '/api/governance/delegate' && init?.method === 'POST') {
      return Response.json({
        success: true,
        to: '0x1111111111111111111111111111111111111111',
        data: '0x1234',
        value: '0',
        protocol: 'aave',
        delegator: wagmiState.address,
        delegatee: '0x2222222222222222222222222222222222222222',
      });
    }
    return Response.json({}, { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('AdvancedPanels', () => {
  beforeEach(() => {
    wagmiState.address = '0x1234567890123456789012345678901234567890';
    wagmiState.isConnected = true;
    vi.unstubAllGlobals();
  });

  it('lists and follows strategy templates without enabling execution', async () => {
    const fetchMock = mockFetch();
    render(<StrategyMarketplacePanel />);

    await screen.findByText('Weekly ETH DCA');
    await userEvent.click(screen.getByRole('button', { name: 'Follow strategy' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/strategies/dca-eth-weekly/follow',
        expect.objectContaining({ method: 'POST' }),
      );
    });
    expect(screen.getByText(/Execution remains explicit/)).toBeInTheDocument();
  });

  it('creates a session-key policy from explicit user-provided key material', async () => {
    const fetchMock = mockFetch();
    render(<SessionKeyPanel />);

    await userEvent.type(
      screen.getByPlaceholderText('Session key address'),
      '0x3333333333333333333333333333333333333333',
    );
    await userEvent.type(screen.getByPlaceholderText('Function selector'), '0x12345678');
    await userEvent.click(screen.getByRole('button', { name: 'Save policy' }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([url, init]) => url === '/api/session-keys' && init?.method === 'POST');
      expect(post).toBeTruthy();
      expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({
        sessionKeyAddress: '0x3333333333333333333333333333333333333333',
        ownerAddress: wagmiState.address,
      });
    });
  });

  it('builds governance delegation transaction data without broadcasting', async () => {
    const fetchMock = mockFetch();
    render(<GovernanceActionsPanel />);

    await userEvent.type(
      screen.getByPlaceholderText('Delegatee address'),
      '0x2222222222222222222222222222222222222222',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Build transaction' }));

    await screen.findByText('0x1111111111111111111111111111111111111111');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/governance/delegate',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(screen.getByText('0x1234')).toBeInTheDocument();
  });
});
