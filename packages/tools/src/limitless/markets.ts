/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { LimitlessSearchParams, LimitlessDeps, LimitlessMarket } from './types.js';

export { LimitlessNotConfiguredError } from './adapter.js';

export async function searchMarkets(
  params: LimitlessSearchParams,
  deps: LimitlessDeps = {},
): Promise<LimitlessMarket[]> {
  if (!deps.apiUrl) {
    const { LimitlessNotConfiguredError } = await import('./adapter.js');
    throw new LimitlessNotConfiguredError();
  }

  const f = deps.fetchImpl ?? fetch;
  const url = new URL(`${deps.apiUrl}/markets`);
  url.searchParams.set('search', params.query);
  url.searchParams.set('limit', String(params.limit ?? 10));

  const res = await f(url.toString());
  if (!res.ok) throw new Error(`Limitless API error: ${res.status}`);

  const data = (await res.json()) as { id: string; question: string; resolutionDate: string; yesPrice: number; noPrice: number; liquidity: string; volume: string; status: string }[];
  return data.map((row) => ({
    id: row.id,
    question: row.question,
    resolutionDate: row.resolutionDate,
    yesPrice: row.yesPrice,
    noPrice: row.noPrice,
    liquidity: BigInt(row.liquidity ?? '0'),
    volume: BigInt(row.volume ?? '0'),
    status: row.status as 'open' | 'resolved' | 'closed',
  }));
}
