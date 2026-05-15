import { describe, test, expect } from 'vitest';
import { getFarcasterUser } from './farcaster-connect';

describe('farcaster-connect', () => {
  test('getFarcasterUser returns null when not in frame', async () => {
    const user = await getFarcasterUser();
    expect(user).toBeNull();
  });
});
