/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { StrategyMetadata, StrategyDeps } from './types.js';

export async function listStrategies(
  _deps: StrategyDeps = {},
): Promise<StrategyMetadata[]> {
  return [
    {
      id: 'dca-eth-weekly',
      name: 'DCA into ETH weekly',
      description: 'Buy $100 of ETH every Monday',
      creator: '0x0000000000000000000000000000000000000000',
      chainId: 8453,
      visibility: 'public',
      version: 1,
      followers: 42,
      totalVolume: '50000',
      successRate: 98,
      tags: ['dca', 'eth', 'weekly'],
    },
    {
      id: 'auto-repay-aave',
      name: 'Auto-repay Aave loans',
      description: 'Automatically repay when health factor drops below 1.3',
      creator: '0x0000000000000000000000000000000000000000',
      chainId: 8453,
      visibility: 'public',
      version: 1,
      followers: 128,
      totalVolume: '250000',
      successRate: 100,
      tags: ['auto-repay', 'aave', 'safety'],
    },
  ];
}

export async function getStrategy(
  id: string,
  deps: StrategyDeps = {},
): Promise<StrategyMetadata | null> {
  const strategies = await listStrategies(deps);
  return strategies.find(s => s.id === id) ?? null;
}
