/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export const VALID_FREQUENCIES = ['daily', 'weekly', 'biweekly', 'monthly'] as const;
export type Frequency = (typeof VALID_FREQUENCIES)[number];

export const VALID_END_CONDITIONS = ['never', 'count', 'date'] as const;
export type EndCondition = (typeof VALID_END_CONDITIONS)[number];

export type ValidationResult = { ok: true } | { ok: false; error: string };

export interface DCAValidationParams {
  frequency: string;
  amountPerTick: string;
  endCondition?: string;
  maxExecutions?: number;
  endDate?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  hourOfDay?: number;
}

export function validateDCASchedule(params: DCAValidationParams): ValidationResult {
  if (!VALID_FREQUENCIES.includes(params.frequency as Frequency)) {
    return { ok: false, error: `Invalid frequency: ${params.frequency}. Must be one of: ${VALID_FREQUENCIES.join(', ')}` };
  }

  const amount = Number(params.amountPerTick);
  if (!params.amountPerTick || isNaN(amount) || amount <= 0) {
    return { ok: false, error: 'amountPerTick must be a positive number' };
  }

  if (amount > 1_000_000) {
    return { ok: false, error: 'amountPerTick exceeds maximum of 1,000,000' };
  }

  const endCondition = params.endCondition ?? 'never';
  if (!VALID_END_CONDITIONS.includes(endCondition as EndCondition)) {
    return { ok: false, error: `Invalid endCondition: ${endCondition}. Must be one of: ${VALID_END_CONDITIONS.join(', ')}` };
  }

  if (endCondition === 'count') {
    if (!params.maxExecutions || params.maxExecutions < 1) {
      return { ok: false, error: 'maxExecutions must be a positive integer when endCondition is "count"' };
    }
    if (params.maxExecutions > 10000) {
      return { ok: false, error: 'maxExecutions exceeds maximum of 10,000' };
    }
  }

  if (endCondition === 'date') {
    if (!params.endDate) {
      return { ok: false, error: 'endDate is required when endCondition is "date"' };
    }
    const end = new Date(params.endDate);
    if (isNaN(end.getTime())) {
      return { ok: false, error: 'endDate is not a valid date' };
    }
    if (end.getTime() <= Date.now()) {
      return { ok: false, error: 'endDate must be in the future' };
    }
  }

  if (params.frequency === 'weekly' && params.dayOfWeek !== undefined) {
    if (params.dayOfWeek < 0 || params.dayOfWeek > 6) {
      return { ok: false, error: 'dayOfWeek must be between 0 (Sunday) and 6 (Saturday)' };
    }
  }

  if (params.frequency === 'monthly' && params.dayOfMonth !== undefined) {
    if (params.dayOfMonth < 1 || params.dayOfMonth > 31) {
      return { ok: false, error: 'dayOfMonth must be between 1 and 31' };
    }
  }

  if (params.hourOfDay !== undefined && (params.hourOfDay < 0 || params.hourOfDay > 23)) {
    return { ok: false, error: 'hourOfDay must be between 0 and 23' };
  }

  return { ok: true };
}

export interface ValidateBalanceParams {
  userAddress: string;
  token: string;
  amount: bigint;
  rpcUrl?: string;
}

export interface ValidateAllowanceParams {
  userAddress: string;
  token: string;
  spender: string;
  amount: bigint;
  rpcUrl?: string;
}

function defaultRpcUrl(): string {
  const url = process.env['RPC_URL'] ?? process.env['NEXT_PUBLIC_RPC_URL'];
  if (!url) throw new Error('RPC_URL env var required for on-chain validation');
  return url;
}

async function ethCall(rpcUrl: string, to: string, data: string): Promise<string> {
  const resp = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to, data }, 'latest'] }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!resp.ok) throw new Error(`rpc_http_${resp.status}`);
  const json = await resp.json() as { result?: string; error?: { message: string } };
  if (json.error) throw new Error(`rpc_error: ${json.error.message}`);
  return json.result ?? '0x';
}

function pad32(address: string): string {
  return address.toLowerCase().replace('0x', '').padStart(64, '0');
}

function decodeUint256(hex: string): bigint {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (!clean || clean.length < 64) return 0n;
  return BigInt('0x' + clean.slice(0, 64));
}

export async function validateBalance(
  params: ValidateBalanceParams,
  _fetchBalance?: (token: string, user: string, rpcUrl: string) => Promise<bigint>,
): Promise<ValidationResult> {
  const rpcUrl = params.rpcUrl ?? defaultRpcUrl();
  const fetchBalance = _fetchBalance ?? (async (token, user, url) => {
    // balanceOf(address)
    const data = '0x70a08231' + pad32(user);
    const result = await ethCall(url, token, data);
    return decodeUint256(result);
  });
  const balance = await fetchBalance(params.token, params.userAddress, rpcUrl);
  if (balance < params.amount) {
    return { ok: false, error: 'insufficient_balance' };
  }
  return { ok: true };
}

export async function validateAllowance(
  params: ValidateAllowanceParams,
  _fetchAllowance?: (token: string, owner: string, spender: string, rpcUrl: string) => Promise<bigint>,
): Promise<ValidationResult> {
  const rpcUrl = params.rpcUrl ?? defaultRpcUrl();
  const fetchAllowance = _fetchAllowance ?? (async (token, owner, spender, url) => {
    // allowance(address,address)
    const data = '0xdd62ed3e' + pad32(owner) + pad32(spender);
    const result = await ethCall(url, token, data);
    return decodeUint256(result);
  });
  const allowance = await fetchAllowance(params.token, params.userAddress, params.spender, rpcUrl);
  if (allowance < params.amount) {
    return { ok: false, error: 'insufficient_allowance' };
  }
  return { ok: true };
}
