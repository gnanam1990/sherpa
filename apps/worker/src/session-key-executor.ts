/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export interface SessionKeyPermissionRecord {
  target: string;
  selector: string;
  maxValue: string;
}

export interface SessionKeyRecord {
  id: string;
  owner_address: string;
  session_key_address: string;
  chain_id: number;
  permissions: SessionKeyPermissionRecord[];
  scope: Array<{ target: string; functions: string[] }>;
  limits: Record<string, string | number | undefined>;
  spend_limit: string;
  spent_amount: string;
  valid_from: string;
  valid_until: string;
  max_executions: number;
  execution_count: number;
  status: string;
  created_at: string;
}

export interface SessionKeyStore {
  create(params: any): Promise<SessionKeyRecord>;
  getById(id: string): Promise<SessionKeyRecord | null>;
  getActiveByOwner(addr: string): Promise<SessionKeyRecord[]>;
  getByOwner(addr: string): Promise<SessionKeyRecord[]>;
  updateStatus(id: string, status: string): Promise<void>;
  updateLimits(id: string, limits: any): Promise<void>;
  incrementSpent(id: string, amount: string, gas?: string): Promise<void>;
  logExecution(params: any): Promise<any>;
  getUsageStats(id: string): Promise<any>;
  getExecutionsByKeyId(id: string, limit?: number): Promise<any[]>;
  cleanupExpired(): Promise<number>;
}

export interface ExecutorDeps {
  store: SessionKeyStore;
  signTx: (keyAddress: string, tx: TxRequest) => Promise<string>;
  broadcastTx: (signedTx: string) => Promise<string>;
  getGasUsed: (txHash: string) => Promise<string>;
  getTodayUsage?: (keyId: string) => Promise<{ spent: string; executions: number }>;
}

export interface TxRequest {
  to: string;
  data: string;
  value: string;
}

export interface ExecutionResult {
  ok: boolean;
  txHash?: string;
  gasUsed?: string;
  error?: string;
}

function selectorFromData(data: string): `0x${string}` {
  return (data.slice(0, 10) || '0x') as `0x${string}`;
}

function validateAgainstGrant(
  key: SessionKeyRecord,
  target: string,
  selector: string,
  value: bigint,
): string[] {
  const errors: string[] = [];

  if (key.status !== 'active') {
    errors.push(`Session key is ${key.status}`);
    return errors;
  }

  const now = Math.floor(Date.now() / 1000);
  const validUntil = Math.floor(new Date(key.valid_until).getTime() / 1000);
  if (now >= validUntil) {
    errors.push('Session key has expired');
    return errors;
  }

  if (key.execution_count >= key.max_executions) {
    errors.push('Execution limit reached');
    return errors;
  }

  const spent = BigInt(key.spent_amount);
  const limit = BigInt(key.spend_limit);
  if (spent + value > limit) {
    errors.push(`Spend limit exceeded: ${spent} + ${value} > ${limit}`);
  }

  const matching = key.permissions.filter(
    (p) =>
      p.target.toLowerCase() === target.toLowerCase() &&
      p.selector === selector,
  );

  if (matching.length === 0) {
    const targetMatch = key.permissions.filter(
      (p) => p.target.toLowerCase() === target.toLowerCase(),
    );
    if (targetMatch.length === 0) {
      errors.push(`Target contract ${target} not in permission whitelist`);
    } else {
      errors.push(`Function ${selector} not permitted on ${target}`);
    }
  } else {
    const maxAllowed = matching.reduce(
      (max, p) => (BigInt(p.maxValue) > max ? BigInt(p.maxValue) : max),
      0n,
    );
    if (value > maxAllowed) {
      errors.push(`Value ${value} exceeds per-call limit ${maxAllowed} for ${target}.${selector}`);
    }
  }

  return errors;
}

function checkUsageLimits(
  limits: Record<string, string | number | undefined>,
  spentTotal: string,
  todaySpent: string,
  todayExecutions: number,
  txValue: string,
): string[] {
  const errors: string[] = [];
  const value = BigInt(txValue);

  if (limits.perTxValue) {
    const max = BigInt(String(limits.perTxValue));
    if (value > max) {
      errors.push(`Per-transaction limit exceeded: ${txValue} > ${limits.perTxValue}`);
    }
  }

  if (limits.dailyTotal) {
    const max = BigInt(String(limits.dailyTotal));
    const today = BigInt(todaySpent);
    if (today + value > max) {
      errors.push(`Daily limit exceeded: ${todaySpent} + ${txValue} > ${limits.dailyTotal}`);
    }
  }

  if (limits.totalLimit) {
    const max = BigInt(String(limits.totalLimit));
    const total = BigInt(spentTotal);
    if (total + value > max) {
      errors.push(`Total limit exceeded: ${spentTotal} + ${txValue} > ${limits.totalLimit}`);
    }
  }

  if (limits.maxExecutionsPerDay !== undefined) {
    if (todayExecutions >= Number(limits.maxExecutionsPerDay)) {
      errors.push(`Daily execution limit reached: ${todayExecutions} >= ${limits.maxExecutionsPerDay}`);
    }
  }

  return errors;
}

export async function executeWithSessionKey(
  key: SessionKeyRecord,
  tx: TxRequest,
  deps: ExecutorDeps,
): Promise<ExecutionResult> {
  const selector = selectorFromData(tx.data);
  const value = BigInt(tx.value);

  const validationErrors = validateAgainstGrant(key, tx.to, selector, value);

  if (validationErrors.length > 0) {
    await logFailedExecution(key, tx, deps, validationErrors.join('; '));
    return { ok: false, error: validationErrors.join('; ') };
  }

  const todayUsage = deps.getTodayUsage
    ? await deps.getTodayUsage(key.id)
    : { spent: '0', executions: 0 };

  const usageErrors = checkUsageLimits(
    key.limits,
    key.spent_amount,
    todayUsage.spent,
    todayUsage.executions,
    tx.value,
  );

  if (usageErrors.length > 0) {
    await logFailedExecution(key, tx, deps, usageErrors.join('; '));
    return { ok: false, error: usageErrors.join('; ') };
  }

  try {
    const signedTx = await deps.signTx(key.session_key_address, tx);
    const txHash = await deps.broadcastTx(signedTx);
    const gasUsed = await deps.getGasUsed(txHash);

    await deps.store.incrementSpent(key.id, tx.value, gasUsed);

    await deps.store.logExecution({
      sessionKeyId: key.id,
      target: tx.to,
      selector,
      value: tx.value,
      calldata: tx.data,
      txHash,
      status: 'success',
      gasUsed,
    });

    return { ok: true, txHash, gasUsed };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown execution error';
    await logFailedExecution(key, tx, deps, msg);
    return { ok: false, error: msg };
  }
}

async function logFailedExecution(
  key: SessionKeyRecord,
  tx: TxRequest,
  deps: ExecutorDeps,
  _error: string,
): Promise<void> {
  const selector = tx.data.slice(0, 10) || '0x';
  await deps.store
    .logExecution({
      sessionKeyId: key.id,
      target: tx.to,
      selector,
      value: tx.value,
      calldata: tx.data,
      status: 'failed',
    })
    .catch(() => {});
}

export async function cleanupExpiredKeys(store: SessionKeyStore): Promise<number> {
  return store.cleanupExpired();
}
