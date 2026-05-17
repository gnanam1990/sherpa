import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AlertsPanel } from './AutomationPanels';

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
    if (url.startsWith('/api/alerts/') && (!init || init.method === undefined)) {
      return Response.json({ alerts: [] });
    }
    if (url === '/api/alerts' && init?.method === 'POST') {
      return Response.json(
        {
          id: 'alert-1',
          conditionType: 'price',
          asset: { symbol: 'ETH' },
          comparison: '>',
          threshold: 5000,
          notificationChannels: JSON.parse(String(init.body)).notificationChannels,
          status: 'active',
          triggerCount: 0,
          createdAt: new Date().toISOString(),
        },
        { status: 201 },
      );
    }
    return Response.json({}, { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('AlertsPanel', () => {
  beforeEach(() => {
    wagmiState.address = '0x1234567890123456789012345678901234567890';
    wagmiState.isConnected = true;
    vi.restoreAllMocks();
  });

  it('creates in-app alerts by default', async () => {
    const fetchMock = mockFetch();
    render(<AlertsPanel />);

    await userEvent.click(screen.getByRole('button', { name: 'Create alert' }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([url, init]) => url === '/api/alerts' && init?.method === 'POST');
      expect(post).toBeTruthy();
      expect(JSON.parse(String(post?.[1]?.body)).notificationChannels).toEqual(['push']);
    });
  });

  it('requires and sends telegram chat id for Telegram alerts', async () => {
    const fetchMock = mockFetch();
    render(<AlertsPanel />);

    await userEvent.selectOptions(screen.getByDisplayValue('In-app'), 'telegram');
    expect(screen.getByRole('button', { name: 'Create alert' })).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText('Telegram chat ID'), '6102672721');
    await userEvent.click(screen.getByRole('button', { name: 'Create alert' }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([url, init]) => url === '/api/alerts' && init?.method === 'POST');
      expect(post).toBeTruthy();
      const body = JSON.parse(String(post?.[1]?.body));
      expect(body.notificationChannels).toEqual(['telegram']);
      expect(body.params).toEqual({ telegramChatId: '6102672721' });
    });
  });
});
