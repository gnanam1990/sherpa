'use client';


/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

/**
 * usePositionsData — the Aave V3 positions read pipeline.
 *
 * Behaviour-preserving extraction of the fetch/state machine that lived in
 * PositionsView. Both the legacy PositionsView and the Glass positions
 * screen consume this so there is one source of truth for the data and
 * its error/empty/loading states. PositionsView.test.tsx is the contract.
 */

export type PositionsResponse = {
  address: string;
  chain: string;
  pool: string;
  totalCollateralBase: string;
  totalDebtBase: string;
  availableBorrowsBase: string;
  currentLiquidationThreshold: string;
  ltv: string;
  healthFactor: string;
  hasPosition: boolean;
  fetchedAt: string;
};

async function readPositionsResponse(res: Response): Promise<PositionsResponse> {
  const text = await res.text();
  let body: (PositionsResponse & { error?: string; details?: string }) | null = null;
  if (text) {
    try {
      body = JSON.parse(text) as PositionsResponse & {
        error?: string;
        details?: string;
      };
    } catch {
      if (!res.ok) throw new Error(`Positions API unavailable (${res.status})`);
      throw new Error('Positions API returned an invalid response');
    }
  }
  if (!res.ok) {
    throw new Error(
      body?.details ?? body?.error ?? `Positions API unavailable (${res.status})`,
    );
  }
  if (!body) throw new Error('Positions API returned an empty response');
  return body;
}

export type UsePositionsDataOptions = {
  initialData?: PositionsResponse;
  addressOverride?: `0x${string}`;
};

export type UsePositionsDataResult = {
  /** Wallet connected (or an explicit address override is present). */
  connected: boolean;
  address?: `0x${string}`;
  data: PositionsResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function usePositionsData({
  initialData,
  addressOverride,
}: UsePositionsDataOptions = {}): UsePositionsDataResult {
  const { address: accountAddress, isConnected } = useAccount();
  const address = addressOverride ?? accountAddress;
  const connected = Boolean(addressOverride || (isConnected && accountAddress));
  const [data, setData] = useState<PositionsResponse | null>(initialData ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/positions/${address}`);
      const json = await readPositionsResponse(res);
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (!initialData && connected && address) void refresh();
  }, [address, connected, refresh, initialData]);

  return { connected, address, data, loading, error, refresh };
}
