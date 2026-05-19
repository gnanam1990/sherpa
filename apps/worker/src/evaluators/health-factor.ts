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

export async function evaluateHealthFactor(alert: AlertRow): Promise<EvaluateResult> {
  const userAddress = alert.user_address;
  if (!userAddress) return { value: 0, triggered: false, error: 'missing user_address' };

  let hf: number;
  try {
    hf = await fetchAaveHealthFactor(userAddress);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { value: 0, triggered: false, error: `rpc_failure: ${msg}` };
  }

  const triggered = checkCondition(hf, alert.comparison, Number(alert.threshold));
  return { value: hf, triggered };
}

// getUserAccountData(address) returns 6 values (Aave V3 IPool):
//   [0] totalCollateralBase
//   [1] totalDebtBase
//   [2] availableBorrowsBase
//   [3] currentLiquidationThreshold
//   [4] ltv
//   [5] healthFactor  ← read from word 5, not word 7 (P2-7)
export async function fetchAaveHealthFactor(
  address: string,
  rpcUrl = process.env.BASE_RPC_URL ?? 'https://mainnet.base.org',
): Promise<number> {
  const poolAddress = '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5';

  const data =
    '0x35ea6a75' +
    '000000000000000000000000' +
    address.slice(2).toLowerCase();

  const resp = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to: poolAddress, data }, 'latest'],
    }),
  });

  if (!resp.ok) throw new Error(`rpc_http_${resp.status}`);

  const json = (await resp.json()) as { result?: string; error?: { message: string } };
  if (json.error) throw new Error(`rpc_error: ${json.error.message}`);
  if (!json.result || json.result === '0x') return 0;

  const hex = json.result;
  const totalDebt = BigInt('0x' + hex.slice(2 + 64 * 1, 2 + 64 * 2));
  if (totalDebt === 0n) return Infinity;

  const healthFactor = BigInt('0x' + hex.slice(2 + 64 * 5, 2 + 64 * 6));
  return Number(healthFactor) / 1e18;
}
