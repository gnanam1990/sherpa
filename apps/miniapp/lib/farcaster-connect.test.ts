import { afterEach, describe, test, expect, vi } from 'vitest';

vi.mock('@farcaster/frame-sdk', () => ({
  default: {
    actions: {
      ready: vi.fn().mockResolvedValue(undefined),
      addFrame: vi.fn().mockResolvedValue({
        added: true,
        notificationDetails: {
          token: 'tok',
          url: 'https://api.farcaster.xyz/v1/frame-notifications',
        },
      }),
    },
    context: Promise.resolve({
      user: {
        fid: 12345,
        username: 'testuser',
        displayName: 'Test User',
        pfpUrl: 'https://example.com/pfp.png',
      },
    }),
  },
}));

import {
  addSherpaMiniApp,
  getFarcasterNotificationStatus,
  getFarcasterUser,
  saveFarcasterNotificationDetails,
} from './farcaster-connect';

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('getFarcasterUser', () => {
  test('returns user when Farcaster context is available', async () => {
    const user = await getFarcasterUser();
    expect(user).not.toBeNull();
    expect(user?.fid).toBe(12345);
    expect(user?.username).toBe('testuser');
  });

  test('returns null when SDK throws', async () => {
    const sdk = (await import('@farcaster/frame-sdk')).default;
    (sdk.actions.ready as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('not in frame'));
    const user = await getFarcasterUser();
    expect(user).toBeNull();
  });
});

describe('addSherpaMiniApp', () => {
  test('returns notification details from addFrame', async () => {
    const result = await addSherpaMiniApp();
    expect(result.added).toBe(true);
    if (result.added) {
      expect(result.notificationDetails?.token).toBe('tok');
    }
  });
});

describe('saveFarcasterNotificationDetails', () => {
  test('posts notification details to the Farcaster webhook endpoint', async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await saveFarcasterNotificationDetails(976779, {
      token: 'tok',
      url: 'https://api.farcaster.xyz/v1/frame-notifications',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/webhooks/farcaster',
      expect.objectContaining({ method: 'POST' }),
    );
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.event).toBe('notifications-enabled');
    expect(body.fid).toBe(976779);
    expect(body.notificationDetails.token).toBe('tok');
  });

  test('throws when webhook save fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: 'bad' }, { status: 400 })));
    await expect(
      saveFarcasterNotificationDetails(976779, {
        token: 'tok',
        url: 'https://api.farcaster.xyz/v1/frame-notifications',
      }),
    ).rejects.toThrow('bad');
  });
});

describe('getFarcasterNotificationStatus', () => {
  test('returns true when readiness endpoint is active', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ active: true })));
    await expect(getFarcasterNotificationStatus(976779)).resolves.toBe(true);
  });

  test('returns false when readiness endpoint is inactive', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ active: false })));
    await expect(getFarcasterNotificationStatus(976779)).resolves.toBe(false);
  });
});
