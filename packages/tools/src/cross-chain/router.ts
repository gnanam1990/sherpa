/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { CrossChainRoute, CrossChainDeps } from './types.js';

export async function findBestRoute(
  source: string,
  dest: string,
  amount: bigint,
  deps: CrossChainDeps,
): Promise<CrossChainRoute> {
  void deps;
  return {
    sourceChain: source,
    destinationChain: dest,
    bridgeProtocol: 'across',
    estimatedTime: 120,
    fee: amount / 1000n,
    minAmount: 1000000n,
    maxAmount: 1000000000000n,
  };
}

export function estimateCrossChainTime(source: string, dest: string): number {
  if (source === 'ethereum' || dest === 'ethereum') return 600;
  return 120;
}
