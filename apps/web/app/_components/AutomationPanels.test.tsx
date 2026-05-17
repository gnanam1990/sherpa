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
    if (url === '/api/farcaster/notifications/976779/status') {
      return Response.json({
        active: true,
        fid: '976779',
        client: 'farcaster',
        urlHost: 'api.farcaster.xyz',
      });
    }
    if (url.startsWith('/api/farcaster/notifications/')) {
      return Response.json({ active: false, fid: '1' });
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
    vi.unstubAllEnvs();
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

  it('requires and sends email recipient for Email alerts', async () => {
    const fetchMock = mockFetch();
    render(<AlertsPanel />);

    await userEvent.selectOptions(screen.getByDisplayValue('In-app'), 'email');
    expect(screen.getByRole('button', { name: 'Create alert' })).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText('Email address'), 'builder@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Create alert' }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([url, init]) => url === '/api/alerts' && init?.method === 'POST');
      expect(post).toBeTruthy();
      const body = JSON.parse(String(post?.[1]?.body));
      expect(body.notificationChannels).toEqual(['email']);
      expect(body.params).toEqual({ email: 'builder@example.com' });
    });
  });

  it('enables and sends browser push subscription for Web Push alerts', async () => {
    vi.stubEnv('NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY', 'BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
    Object.defineProperty(window, 'PushManager', { configurable: true, value: function PushManager() {} });
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: { requestPermission: vi.fn(async () => 'granted') },
    });
    const subscription = {
      toJSON: () => ({
        endpoint: 'https://push.example.com/sub',
        keys: { auth: 'auth', p256dh: 'p256dh' },
      }),
    };
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn(async () => null),
            subscribe: vi.fn(async () => subscription),
          },
        }),
      },
    });
    const fetchMock = mockFetch();
    render(<AlertsPanel />);

    await userEvent.selectOptions(screen.getByDisplayValue('In-app'), 'web-push');
    expect(screen.getByRole('button', { name: 'Create alert' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Enable browser push' }));
    await screen.findByText('Browser push ready.');
    await userEvent.click(screen.getByRole('button', { name: 'Create alert' }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([url, init]) => url === '/api/alerts' && init?.method === 'POST');
      expect(post).toBeTruthy();
      const body = JSON.parse(String(post?.[1]?.body));
      expect(body.notificationChannels).toEqual(['web-push']);
      expect(body.params.pushSubscription.endpoint).toBe('https://push.example.com/sub');
    });
  });

  it('requires and sends Farcaster FID for Farcaster alerts', async () => {
    const fetchMock = mockFetch();
    render(<AlertsPanel />);

    await userEvent.selectOptions(screen.getByDisplayValue('In-app'), 'farcaster');
    expect(screen.getByRole('button', { name: 'Create alert' })).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText('Farcaster FID'), '976779');
    await screen.findByText(/Notifications active/);
    await userEvent.click(screen.getByRole('button', { name: 'Create alert' }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([url, init]) => url === '/api/alerts' && init?.method === 'POST');
      expect(post).toBeTruthy();
      const body = JSON.parse(String(post?.[1]?.body));
      expect(body.notificationChannels).toEqual(['farcaster']);
      expect(body.params).toEqual({ farcasterFid: 976779 });
    });
  });

  it('keeps Farcaster alert creation disabled until a Mini App token is active', async () => {
    mockFetch();
    render(<AlertsPanel />);

    await userEvent.selectOptions(screen.getByDisplayValue('In-app'), 'farcaster');
    await userEvent.type(screen.getByPlaceholderText('Farcaster FID'), '123');

    await screen.findByText(/No active token yet/);
    expect(screen.getByRole('button', { name: 'Create alert' })).toBeDisabled();
  });
});
