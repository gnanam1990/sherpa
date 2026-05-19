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

export async function evaluateGas(alert: AlertRow): Promise<EvaluateResult> {
  let gasPrice: number;
  try {
    gasPrice = await fetchGasPrice();
  } catch (err) {
    return {
      value: 0,
      triggered: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
  const triggered = checkCondition(gasPrice, alert.comparison, Number(alert.threshold));
  return { value: gasPrice, triggered };
}

export async function fetchGasPrice(): Promise<number> {
  const rpcUrl = process.env.BASE_RPC_URL ?? 'https://mainnet.base.org';
  const resp = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_gasPrice', params: [] }),
  });
  if (!resp.ok) throw new Error(`rpc_http_${resp.status}`);
  const json = (await resp.json()) as { result?: string; error?: { message: string } };
  if (json.error) throw new Error(`rpc_error: ${json.error.message}`);
  if (!json.result) throw new Error('rpc_missing_result');
  const wei = BigInt(json.result);
  return Number(wei) / 1e9;
}
