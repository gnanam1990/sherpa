import { describe, test, expect, vi } from 'vitest';

vi.mock('@farcaster/frame-sdk', () => ({
  default: {
    actions: {
      ready: vi.fn().mockResolvedValue(undefined),
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

import { getFarcasterUser } from './farcaster-connect';

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
