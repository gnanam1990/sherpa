export type SocialUser = {
  address: `0x${string}`;
  farcasterUsername?: string;
  fid?: number;
  displayName?: string;
  avatarUrl?: string;
  followers: number;
  following: number;
  totalVolume: string;
  successRate: number;
  rank: number;
};

export type CopyTradeSettings = {
  traderAddress: `0x${string}`;
  maxAmountPerTrade: string;
  maxDailyAmount: string;
  enabledIntents: string[];
};

export type SocialDeps = {
  apiUrl?: string;
};
