/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { PortfolioSnapshotStore } from '@sherpa/memory';
import { fetchPortfolio } from '@sherpa/tools';

export type SnapshotFetcherDeps = {
  rpcUrl?: string;
  chainId?: number;
  readContract?: (params: any) => Promise<any>;
  getBalance?: (params: { address: string }) => Promise<bigint>;
};

export type SnapshotWorkerDeps = {
  store: PortfolioSnapshotStore;
  fetchDeps?: SnapshotFetcherDeps;
  log?: { info: (msg: string, meta?: Record<string, unknown>) => void; error: (msg: string, meta?: Record<string, unknown>) => void };
};

export type SnapshotCycleResult = {
  snapshotCount: number;
  errors: string[];
};

/**
 * Run one portfolio snapshot cycle.
 * Reads each tracked wallet's current portfolio and writes a daily snapshot.
 * Skips addresses that already have a snapshot from today.
 */
export async function runSnapshotCycle(deps: SnapshotWorkerDeps): Promise<SnapshotCycleResult> {
  const { store, fetchDeps, log } = deps;
  const result: SnapshotCycleResult = { snapshotCount: 0, errors: [] };

  let addresses: string[];
  try {
    addresses = await store.getTrackedAddresses();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Failed to get tracked addresses: ${msg}`);
    return result;
  }

  const today = new Date().toISOString().slice(0, 10);

  for (const address of addresses) {
    try {
      const existing = await store.getLatestSnapshot(address);
      if (existing && existing.snapshot_at.slice(0, 10) === today) {
        continue; // Already have today's snapshot
      }

      const snapshot = await fetchPortfolio(address as `0x${string}`, fetchDeps);

      await store.createSnapshot({
        userAddress: address,
        chainId: 8453,
        totalValueUsd: snapshot.totalValueUsd.toString(),
        tokens: JSON.stringify(snapshot.tokens.map((t) => ({
          symbol: t.symbol,
          address: t.address,
          balance: t.balance.toString(),
          valueUsd: t.valueUsd.toString(),
          priceUsd: t.priceUsd,
        }))),
        positions: JSON.stringify(snapshot.positions),
      });

      result.snapshotCount++;
      log?.info(`[snapshot] captured ${address}`, {
        totalValueUsd: snapshot.totalValueUsd.toString(),
        tokenCount: snapshot.tokens.length,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`[${address}] ${msg}`);
      log?.error(`[snapshot] failed for ${address}`, { err: msg });
    }
  }

  return result;
}
