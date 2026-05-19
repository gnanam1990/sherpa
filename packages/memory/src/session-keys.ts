/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { Pool } from 'pg';

export interface SessionKeyRecord {
  id: string;
  owner_address: string;
  session_key_address: string;
  chain_id: number;
  permissions: SessionKeyPermission[];
  scope: SessionKeyScope[];
  limits: SessionKeyLimits;
  spend_limit: string;
  spent_amount: string;
  valid_from: string;
  valid_until: string;
  max_executions: number;
  execution_count: number;
  status: 'active' | 'expired' | 'revoked' | 'exhausted';
  created_at: string;
}

export interface SessionKeyPermission {
  target: string;
  selector: string;
  maxValue: string;
}

export interface SessionKeyScope {
  target: string;
  functions: string[];
  maxValuePerTx?: string;
}

export interface SessionKeyLimits {
  perTxValue?: string;
  dailyTotal?: string;
  totalLimit?: string;
  maxExecutionsPerDay?: number;
}

export interface ExecutionRecord {
  id: string;
  session_key_id: string;
  target: string;
  selector: string;
  value: string;
  calldata?: string;
  tx_hash?: string;
  status: string;
  gas_used?: string;
  executed_at: string;
}

export interface CreateSessionKeyParams {
  ownerAddress: string;
  sessionKeyAddress: string;
  chainId: number;
  permissions: SessionKeyPermission[];
  scope: SessionKeyScope[];
  limits: SessionKeyLimits;
  spendLimit: string;
  validFrom: Date;
  validUntil: Date;
  maxExecutions?: number;
}

export interface LogExecutionParams {
  sessionKeyId: string;
  target: string;
  selector: string;
  value: string;
  calldata?: string;
  txHash?: string;
  status: string;
  gasUsed?: string;
}

export interface UsageStats {
  totalTransactions: number;
  totalGasUsed: string;
  totalValueTransacted: string;
  dailyUsage: Array<{ date: string; count: number; gas: string; value: string }>;
  status: string;
  spentAmount: string;
  spendLimit: string;
  executionCount: number;
  maxExecutions: number;
}

// ── In-memory implementation (tests / local dev) ──────────────────────

export interface SessionKeyStore {
  create(params: CreateSessionKeyParams): Promise<SessionKeyRecord>;
  getById(id: string): Promise<SessionKeyRecord | null>;
  getActiveByOwner(ownerAddress: string): Promise<SessionKeyRecord[]>;
  getByOwner(ownerAddress: string): Promise<SessionKeyRecord[]>;
  updateStatus(id: string, status: string): Promise<void>;
  updateLimits(id: string, limits: Partial<SessionKeyLimits>, spendLimit?: string): Promise<void>;
  incrementSpent(id: string, amount: string, gasUsed?: string): Promise<void>;
  logExecution(params: LogExecutionParams): Promise<ExecutionRecord>;
  getUsageStats(id: string): Promise<UsageStats>;
  getExecutionsByKeyId(id: string, limit?: number): Promise<ExecutionRecord[]>;
  cleanupExpired(): Promise<number>;
}

export class InMemorySessionKeyStore implements SessionKeyStore {
  private keys = new Map<string, SessionKeyRecord>();
  private executions = new Map<string, ExecutionRecord[]>();

  async create(params: CreateSessionKeyParams): Promise<SessionKeyRecord> {
    const id = crypto.randomUUID();
    const record: SessionKeyRecord = {
      id,
      owner_address: params.ownerAddress,
      session_key_address: params.sessionKeyAddress,
      chain_id: params.chainId,
      permissions: params.permissions,
      scope: params.scope,
      limits: params.limits,
      spend_limit: params.spendLimit,
      spent_amount: '0',
      valid_from: params.validFrom.toISOString(),
      valid_until: params.validUntil.toISOString(),
      max_executions: params.maxExecutions ?? 1000,
      execution_count: 0,
      status: 'active',
      created_at: new Date().toISOString(),
    };
    this.keys.set(id, record);
    this.executions.set(id, []);
    return record;
  }

  async getById(id: string): Promise<SessionKeyRecord | null> {
    return this.keys.get(id) ?? null;
  }

  async getActiveByOwner(ownerAddress: string): Promise<SessionKeyRecord[]> {
    const now = new Date();
    return Array.from(this.keys.values()).filter(
      (k) =>
        k.owner_address.toLowerCase() === ownerAddress.toLowerCase() &&
        k.status === 'active' &&
        new Date(k.valid_until) > now,
    );
  }

  async getByOwner(ownerAddress: string): Promise<SessionKeyRecord[]> {
    return Array.from(this.keys.values()).filter(
      (k) => k.owner_address.toLowerCase() === ownerAddress.toLowerCase(),
    );
  }

  async updateStatus(id: string, status: string): Promise<void> {
    const key = this.keys.get(id);
    if (key) key.status = status as SessionKeyRecord['status'];
  }

  async updateLimits(
    id: string,
    limits: Partial<SessionKeyLimits>,
    spendLimit?: string,
  ): Promise<void> {
    const key = this.keys.get(id);
    if (key) {
      key.limits = { ...key.limits, ...limits };
      if (spendLimit !== undefined) key.spend_limit = spendLimit;
    }
  }

  async incrementSpent(id: string, amount: string, _gasUsed?: string): Promise<void> {
    const key = this.keys.get(id);
    if (!key) return;
    key.spent_amount = (BigInt(key.spent_amount) + BigInt(amount)).toString();
    key.execution_count += 1;
    if (key.execution_count >= key.max_executions) {
      key.status = 'exhausted';
    }
  }

  async logExecution(params: LogExecutionParams): Promise<ExecutionRecord> {
    const id = crypto.randomUUID();
    const record: ExecutionRecord = {
      id,
      session_key_id: params.sessionKeyId,
      target: params.target,
      selector: params.selector,
      value: params.value,
      calldata: params.calldata,
      tx_hash: params.txHash,
      status: params.status,
      gas_used: params.gasUsed,
      executed_at: new Date().toISOString(),
    };
    const list = this.executions.get(params.sessionKeyId) ?? [];
    list.push(record);
    this.executions.set(params.sessionKeyId, list);
    return record;
  }

  async getUsageStats(id: string): Promise<UsageStats> {
    const key = this.keys.get(id);
    if (!key) throw new Error(`Session key ${id} not found`);

    const execs = this.executions.get(id) ?? [];
    const totalGas = execs.reduce((sum, e) => sum + BigInt(e.gas_used ?? '0'), 0n);
    const totalValue = execs.reduce((sum, e) => sum + BigInt(e.value), 0n);

    const dailyMap = new Map<string, { count: number; gas: bigint; value: bigint }>();
    for (const e of execs) {
      const date = e.executed_at.slice(0, 10);
      const entry = dailyMap.get(date) ?? { count: 0, gas: 0n, value: 0n };
      entry.count += 1;
      entry.gas += BigInt(e.gas_used ?? '0');
      entry.value += BigInt(e.value);
      dailyMap.set(date, entry);
    }

    return {
      totalTransactions: execs.length,
      totalGasUsed: totalGas.toString(),
      totalValueTransacted: totalValue.toString(),
      dailyUsage: Array.from(dailyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, d]) => ({
          date,
          count: d.count,
          gas: d.gas.toString(),
          value: d.value.toString(),
        })),
      status: key.status,
      spentAmount: key.spent_amount,
      spendLimit: key.spend_limit,
      executionCount: key.execution_count,
      maxExecutions: key.max_executions,
    };
  }

  async getExecutionsByKeyId(id: string, limit = 50): Promise<ExecutionRecord[]> {
    return (this.executions.get(id) ?? []).slice(-limit);
  }

  async cleanupExpired(): Promise<number> {
    const now = new Date();
    let count = 0;
    for (const [, key] of this.keys) {
      if (key.status === 'active' && new Date(key.valid_until) <= now) {
        key.status = 'expired';
        count++;
      }
    }
    return count;
  }
}

// ── Postgres implementation ───────────────────────────────────────────

export class PostgresSessionKeyStore implements SessionKeyStore {
  constructor(private pool: Pool) {}

  async create(params: CreateSessionKeyParams): Promise<SessionKeyRecord> {
    const { rows } = await this.pool.query(
      `INSERT INTO session_keys
        (owner_address, session_key_address, chain_id, permissions, scope, limits,
         spend_limit, valid_from, valid_until, max_executions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        params.ownerAddress,
        params.sessionKeyAddress,
        params.chainId,
        JSON.stringify(params.permissions),
        JSON.stringify(params.scope),
        JSON.stringify(params.limits),
        params.spendLimit,
        params.validFrom.toISOString(),
        params.validUntil.toISOString(),
        params.maxExecutions ?? 1000,
      ],
    );
    return rows[0] as SessionKeyRecord;
  }

  async getById(id: string): Promise<SessionKeyRecord | null> {
    const { rows } = await this.pool.query('SELECT * FROM session_keys WHERE id = $1', [id]);
    return (rows[0] as SessionKeyRecord) ?? null;
  }

  async getActiveByOwner(ownerAddress: string): Promise<SessionKeyRecord[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM session_keys
       WHERE owner_address = $1 AND status = 'active' AND valid_until > now()
       ORDER BY created_at DESC`,
      [ownerAddress],
    );
    return rows as SessionKeyRecord[];
  }

  async getByOwner(ownerAddress: string): Promise<SessionKeyRecord[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM session_keys WHERE owner_address = $1 ORDER BY created_at DESC',
      [ownerAddress],
    );
    return rows as SessionKeyRecord[];
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.pool.query('UPDATE session_keys SET status = $1 WHERE id = $2', [status, id]);
  }

  async updateLimits(
    id: string,
    limits: Partial<SessionKeyLimits>,
    spendLimit?: string,
  ): Promise<void> {
    if (spendLimit === undefined) {
      await this.pool.query(
        `UPDATE session_keys SET limits = limits || $1::jsonb WHERE id = $2`,
        [JSON.stringify(limits), id],
      );
      return;
    }

    await this.pool.query(
      `UPDATE session_keys
       SET limits = limits || $1::jsonb,
           spend_limit = $2::numeric
       WHERE id = $3`,
      [JSON.stringify(limits), spendLimit, id],
    );
  }

  async incrementSpent(id: string, amount: string, _gasUsed?: string): Promise<void> {
    await this.pool.query(
      `UPDATE session_keys
       SET spent_amount = spent_amount + $1::numeric,
           execution_count = execution_count + 1,
           status = CASE
             WHEN execution_count + 1 >= max_executions THEN 'exhausted'
             ELSE status
           END
       WHERE id = $2`,
      [amount, id],
    );
  }

  async logExecution(params: LogExecutionParams): Promise<ExecutionRecord> {
    const { rows } = await this.pool.query(
      `INSERT INTO session_key_executions
        (session_key_id, target, selector, value, calldata, tx_hash, status, gas_used)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        params.sessionKeyId,
        params.target,
        params.selector,
        params.value,
        params.calldata ?? null,
        params.txHash ?? null,
        params.status,
        params.gasUsed ?? null,
      ],
    );
    return rows[0] as ExecutionRecord;
  }

  async getUsageStats(id: string): Promise<UsageStats> {
    const key = await this.getById(id);
    if (!key) throw new Error(`Session key ${id} not found`);

    const { rows: execRows } = await this.pool.query(
      `SELECT COUNT(*) as total_txs,
              COALESCE(SUM(gas_used), 0) as total_gas,
              COALESCE(SUM(value), 0) as total_value
       FROM session_key_executions
       WHERE session_key_id = $1`,
      [id],
    );

    const { rows: dailyRows } = await this.pool.query(
      `SELECT DATE(executed_at) as date,
              COUNT(*) as count,
              COALESCE(SUM(gas_used), 0) as gas,
              COALESCE(SUM(value), 0) as value
       FROM session_key_executions
       WHERE session_key_id = $1
       GROUP BY DATE(executed_at)
       ORDER BY date DESC
       LIMIT 30`,
      [id],
    );

    const stats = execRows[0];
    return {
      totalTransactions: Number(stats.total_txs),
      totalGasUsed: stats.total_gas?.toString() ?? '0',
      totalValueTransacted: stats.total_value?.toString() ?? '0',
      dailyUsage: (dailyRows as Array<Record<string, unknown>>).map((r) => ({
        date: String(r.date),
        count: Number(r.count),
        gas: String(r.gas ?? '0'),
        value: String(r.value ?? '0'),
      })),
      status: key.status,
      spentAmount: key.spent_amount,
      spendLimit: key.spend_limit,
      executionCount: key.execution_count,
      maxExecutions: key.max_executions,
    };
  }

  async getExecutionsByKeyId(id: string, limit = 50): Promise<ExecutionRecord[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM session_key_executions
       WHERE session_key_id = $1
       ORDER BY executed_at DESC
       LIMIT $2`,
      [id, limit],
    );
    return rows as ExecutionRecord[];
  }

  async cleanupExpired(): Promise<number> {
    const { rowCount } = await this.pool.query(
      `UPDATE session_keys SET status = 'expired'
       WHERE status = 'active' AND valid_until <= now()`,
    );
    return rowCount ?? 0;
  }
}
