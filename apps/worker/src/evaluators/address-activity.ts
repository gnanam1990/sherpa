/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { AlertRow, EvaluateResult } from '../types.js';
import { checkCondition } from './check-condition.js';

export async function evaluateAddressActivity(alert: AlertRow): Promise<EvaluateResult> {
  const address = alert.params?.address as string | undefined;
  if (!address) return { value: 0, triggered: false, error: 'missing address param' };

  let txCount: number;
  try {
    txCount = await fetchRecentTxCount(address);
  } catch (err) {
    return {
      value: 0,
      triggered: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
  const triggered = checkCondition(txCount, alert.comparison, Number(alert.threshold));
  return { value: txCount, triggered };
}

export async function fetchRecentTxCount(address: string): Promise<number> {
  const apiKey = process.env.ETHERSCAN_API_KEY ?? process.env.BASESCAN_API_KEY;
  if (!apiKey) throw new Error('basescan_api_key_required');

  const resp = await fetch(
    `https://api.basescan.org/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&page=1&offset=10&apikey=${apiKey}`,
  );
  if (!resp.ok) throw new Error(`basescan_http_${resp.status}`);
  const data = (await resp.json()) as { status: string; message?: string; result: unknown[] };
  if (data.status !== '1') throw new Error(`basescan_error: ${data.message ?? 'unknown'}`);
  return data.result.length;
}
