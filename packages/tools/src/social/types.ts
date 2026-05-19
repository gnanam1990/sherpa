/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

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
