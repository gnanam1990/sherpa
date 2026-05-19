/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { Address } from '@sherpa/safety';
import type { HistoryIndexer, HistoryItem } from './history.js';

export type BasescanConfig = {
  apiUrl: string;
  apiKey?: string;
};

type BasescanRow = {
  hash: `0x${string}`;
  timeStamp: string;
  from: `0x${string}`;
  to: `0x${string}`;
  value: string;
  tokenSymbol?: string;
  tokenDecimal?: string;
};

type BasescanResponse = {
  status: '0' | '1';
  message: string;
  result: BasescanRow[] | string;
};

/**
 * HTTP indexer backed by Basescan's `tokentx` + `txlist` endpoints. Returns
 * the most recent `limit` items merged & sorted by timestamp desc.
 *
 * Lives behind the `HistoryIndexer` interface so `emptyIndexer` keeps working
 * offline (tests / CI without network).
 */
export function createBasescanIndexer(
  config: BasescanConfig,
  fetchFn: typeof fetch = fetch,
): HistoryIndexer {
  const apiKey = config.apiKey ?? '';

  async function call(module: 'account', action: string, params: Record<string, string>) {
    const url = new URL(config.apiUrl);
    url.searchParams.set('module', module);
    url.searchParams.set('action', action);
    if (apiKey) url.searchParams.set('apikey', apiKey);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetchFn(url.toString());
    if (!res.ok) throw new Error(`[basescan] ${action} returned ${res.status}`);
    const body = (await res.json()) as BasescanResponse;
    if (body.status !== '1' || !Array.isArray(body.result)) return [];
    return body.result;
  }

  function toItem(row: BasescanRow, self: Address, kind: 'erc20' | 'native'): HistoryItem {
    const isOut = row.from.toLowerCase() === self.toLowerCase();
    const counterparty = (isOut ? row.to : row.from) as Address;
    const direction: HistoryItem['direction'] =
      row.from.toLowerCase() === row.to.toLowerCase() ? 'self' : isOut ? 'out' : 'in';
    if (kind === 'native') {
      const eth = Number(row.value) / 1e18;
      return {
        txHash: row.hash,
        timestamp: Number(row.timeStamp) * 1000,
        direction,
        counterparty,
        asset: 'ETH',
        amountDisplay: `${eth.toFixed(6)} ETH`,
      };
    }
    const decimals = Number(row.tokenDecimal ?? '18');
    const amount = Number(row.value) / 10 ** decimals;
    return {
      txHash: row.hash,
      timestamp: Number(row.timeStamp) * 1000,
      direction,
      counterparty,
      asset: row.tokenSymbol ?? 'ERC20',
      amountDisplay: `${amount.toFixed(4)} ${row.tokenSymbol ?? ''}`.trim(),
    };
  }

  return {
    async list(address, limit) {
      const [erc20Rows, nativeRows] = await Promise.all([
        call('account', 'tokentx', {
          address,
          page: '1',
          offset: String(limit),
          sort: 'desc',
        }),
        call('account', 'txlist', {
          address,
          page: '1',
          offset: String(limit),
          sort: 'desc',
        }),
      ]);
      const items = [
        ...erc20Rows.map((r) => toItem(r, address, 'erc20')),
        ...nativeRows.filter((r) => r.value !== '0').map((r) => toItem(r, address, 'native')),
      ];
      items.sort((a, b) => b.timestamp - a.timestamp);
      return items.slice(0, limit);
    },
  };
}
