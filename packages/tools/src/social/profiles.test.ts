import { describe, test, expect } from 'vitest';
import { getProfile, getLeaderboard } from './profiles.js';

describe('Social profiles', () => {
  test('getProfile returns user profile', async () => {
    const profile = await getProfile('0x1234' as `0x${string}`);
    expect(profile.address).toBe('0x1234');
    expect(profile.followers).toBeGreaterThanOrEqual(0);
  });

  test('getLeaderboard returns ranked users', async () => {
    const leaderboard = await getLeaderboard();
    expect(leaderboard.length).toBeGreaterThan(0);
    expect(leaderboard[0]!.rank).toBe(1);
  });
});
