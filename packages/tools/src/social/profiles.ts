import type { SocialUser, SocialDeps } from './types.js';

export async function getProfile(
  address: `0x${string}`,
  _deps: SocialDeps = {},
): Promise<SocialUser> {
  return {
    address,
    followers: 150,
    following: 45,
    totalVolume: '500000',
    successRate: 97.5,
    rank: 42,
  };
}

export async function getLeaderboard(
  _deps: SocialDeps = {},
): Promise<SocialUser[]> {
  return [
    { address: '0x1111', followers: 1000, following: 200, totalVolume: '5000000', successRate: 99, rank: 1 },
    { address: '0x2222', followers: 800, following: 150, totalVolume: '3000000', successRate: 98, rank: 2 },
    { address: '0x3333', followers: 600, following: 100, totalVolume: '2000000', successRate: 97, rank: 3 },
  ];
}
