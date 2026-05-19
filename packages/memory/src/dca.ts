/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type pg from 'pg';
import { query } from '@sherpa/config';

export type DCAScheduleRow = {
  id: string;
  user_address: string;
  from_asset: Record<string, unknown>;
  to_asset: Record<string, unknown>;
  amount_per_tick: string;
  frequency: string;
  day_of_week: number | null;
  day_of_month: number | null;
  hour_of_day: number;
  status: string;
  total_budget: string | null;
  remaining_budget: string | null;
  total_executions: number;
  max_executions: number | null;
  consecutive_failures: number;
  end_condition: string;
  end_date: string | null;
  created_at: string;
  next_execution_at: string;
  last_executed_at: string | null;
};

export type DCAExecutionRow = {
  id: string;
  dca_schedule_id: string;
  amount_in: string;
  amount_out: string | null;
  tx_hash: string | null;
  status: string;
  error: string | null;
  builder_code: string | null;
  executed_at: string;
};

export type CreateDCAScheduleInput = {
  userAddress: string;
  fromAsset: Record<string, unknown>;
  toAsset: Record<string, unknown>;
  amountPerTick: string;
  frequency: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  hourOfDay?: number;
  totalBudget?: string;
  maxExecutions?: number;
  endCondition?: string;
  endDate?: string;
  nextExecutionAt: string;
};

export type UpdateDCAScheduleInput = {
  status?: string;
  amountPerTick?: string;
  frequency?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  hourOfDay?: number;
  totalBudget?: string;
  maxExecutions?: number;
  endCondition?: string;
  endDate?: string;
  nextExecutionAt?: string;
  consecutiveFailures?: number;
  totalExecutions?: number;
  lastExecutedAt?: string;
  remainingBudget?: string;
};

export type CreateDCAExecutionInput = {
  dcaScheduleId: string;
  amountIn: string;
  amountOut?: string;
  txHash?: string;
  status: string;
  error?: string;
  builderCode?: string;
};

export type DCAScheduleStats = {
  totalInvested: string;
  totalReceived: string;
  avgPrice: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  consecutiveFailures: number;
};

export interface DCAStore {
  createSchedule(input: CreateDCAScheduleInput): Promise<DCAScheduleRow>;
  getScheduleById(id: string): Promise<DCAScheduleRow | null>;
  getSchedulesByUser(userAddress: string): Promise<DCAScheduleRow[]>;
  getDueSchedules(now: string): Promise<DCAScheduleRow[]>;
  updateSchedule(id: string, updates: UpdateDCAScheduleInput): Promise<DCAScheduleRow | null>;
  pauseSchedule(id: string): Promise<DCAScheduleRow | null>;
  resumeSchedule(id: string): Promise<DCAScheduleRow | null>;
  deleteSchedule(id: string): Promise<boolean>;
  createExecution(input: CreateDCAExecutionInput): Promise<DCAExecutionRow>;
  getExecutions(scheduleId: string, limit?: number): Promise<DCAExecutionRow[]>;
  getScheduleStats(scheduleId: string): Promise<DCAScheduleStats>;
  incrementFailures(id: string): Promise<void>;
  resetFailures(id: string): Promise<void>;
}

export class InMemoryDCAStore implements DCAStore {
  private schedules = new Map<string, DCAScheduleRow>();
  private executions: DCAExecutionRow[] = [];

  async createSchedule(input: CreateDCAScheduleInput): Promise<DCAScheduleRow> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const row: DCAScheduleRow = {
      id,
      user_address: input.userAddress,
      from_asset: input.fromAsset,
      to_asset: input.toAsset,
      amount_per_tick: input.amountPerTick,
      frequency: input.frequency,
      day_of_week: input.dayOfWeek ?? null,
      day_of_month: input.dayOfMonth ?? null,
      hour_of_day: input.hourOfDay ?? 12,
      status: 'active',
      total_budget: input.totalBudget ?? null,
      remaining_budget: input.totalBudget ?? null,
      total_executions: 0,
      max_executions: input.maxExecutions ?? null,
      consecutive_failures: 0,
      end_condition: input.endCondition ?? 'never',
      end_date: input.endDate ?? null,
      created_at: now,
      next_execution_at: input.nextExecutionAt,
      last_executed_at: null,
    };
    this.schedules.set(id, row);
    return row;
  }

  async getScheduleById(id: string): Promise<DCAScheduleRow | null> {
    return this.schedules.get(id) ?? null;
  }

  async getSchedulesByUser(userAddress: string): Promise<DCAScheduleRow[]> {
    return [...this.schedules.values()].filter(
      (s) => s.user_address.toLowerCase() === userAddress.toLowerCase(),
    );
  }

  async getDueSchedules(now: string): Promise<DCAScheduleRow[]> {
    const nowMs = new Date(now).getTime();
    return [...this.schedules.values()].filter(
      (s) => s.status === 'active' && new Date(s.next_execution_at).getTime() <= nowMs,
    );
  }

  async updateSchedule(id: string, updates: UpdateDCAScheduleInput): Promise<DCAScheduleRow | null> {
    const schedule = this.schedules.get(id);
    if (!schedule) return null;
    if (updates.status !== undefined) schedule.status = updates.status;
    if (updates.amountPerTick !== undefined) schedule.amount_per_tick = updates.amountPerTick;
    if (updates.frequency !== undefined) schedule.frequency = updates.frequency;
    if (updates.dayOfWeek !== undefined) schedule.day_of_week = updates.dayOfWeek;
    if (updates.dayOfMonth !== undefined) schedule.day_of_month = updates.dayOfMonth;
    if (updates.hourOfDay !== undefined) schedule.hour_of_day = updates.hourOfDay;
    if (updates.totalBudget !== undefined) schedule.total_budget = updates.totalBudget;
    if (updates.maxExecutions !== undefined) schedule.max_executions = updates.maxExecutions;
    if (updates.endCondition !== undefined) schedule.end_condition = updates.endCondition;
    if (updates.endDate !== undefined) schedule.end_date = updates.endDate;
    if (updates.nextExecutionAt !== undefined) schedule.next_execution_at = updates.nextExecutionAt;
    if (updates.consecutiveFailures !== undefined) schedule.consecutive_failures = updates.consecutiveFailures;
    if (updates.totalExecutions !== undefined) schedule.total_executions = updates.totalExecutions;
    if (updates.lastExecutedAt !== undefined) schedule.last_executed_at = updates.lastExecutedAt;
    if (updates.remainingBudget !== undefined) schedule.remaining_budget = updates.remainingBudget;
    return schedule;
  }

  async pauseSchedule(id: string): Promise<DCAScheduleRow | null> {
    return this.updateSchedule(id, { status: 'paused' });
  }

  async resumeSchedule(id: string): Promise<DCAScheduleRow | null> {
    const schedule = this.schedules.get(id);
    if (!schedule || schedule.status !== 'paused') return null;
    return this.updateSchedule(id, { status: 'active', consecutiveFailures: 0 });
  }

  async deleteSchedule(id: string): Promise<boolean> {
    return this.schedules.delete(id);
  }

  async createExecution(input: CreateDCAExecutionInput): Promise<DCAExecutionRow> {
    const row: DCAExecutionRow = {
      id: crypto.randomUUID(),
      dca_schedule_id: input.dcaScheduleId,
      amount_in: input.amountIn,
      amount_out: input.amountOut ?? null,
      tx_hash: input.txHash ?? null,
      status: input.status,
      error: input.error ?? null,
      builder_code: input.builderCode ?? null,
      executed_at: new Date().toISOString(),
    };
    this.executions.push(row);
    return row;
  }

  async getExecutions(scheduleId: string, limit = 50): Promise<DCAExecutionRow[]> {
    return this.executions
      .filter((e) => e.dca_schedule_id === scheduleId)
      .sort((a, b) => b.executed_at.localeCompare(a.executed_at))
      .slice(0, limit);
  }

  async getScheduleStats(scheduleId: string): Promise<DCAScheduleStats> {
    const execs = this.executions.filter((e) => e.dca_schedule_id === scheduleId);
    const successful = execs.filter((e) => e.status === 'success');
    const failed = execs.filter((e) => e.status === 'failed');

    const totalInvested = successful.reduce((sum, e) => sum + BigInt(e.amount_in || '0'), 0n);
    const totalReceived = successful.reduce(
      (sum, e) => sum + BigInt(e.amount_out || '0'),
      0n,
    );

    const avgPrice =
      totalReceived > 0n
        ? (totalInvested * 1000000n) / totalReceived
        : 0n;

    const schedule = this.schedules.get(scheduleId);

    return {
      totalInvested: totalInvested.toString(),
      totalReceived: totalReceived.toString(),
      avgPrice: (Number(avgPrice) / 1000000).toString(),
      totalExecutions: execs.length,
      successfulExecutions: successful.length,
      failedExecutions: failed.length,
      consecutiveFailures: schedule?.consecutive_failures ?? 0,
    };
  }

  async incrementFailures(id: string): Promise<void> {
    const schedule = this.schedules.get(id);
    if (schedule) schedule.consecutive_failures++;
  }

  async resetFailures(id: string): Promise<void> {
    const schedule = this.schedules.get(id);
    if (schedule) schedule.consecutive_failures = 0;
  }
}

export function createPostgresDCAStore(pool: pg.Pool): DCAStore {
  return {
    async createSchedule(input) {
      const res = await query<DCAScheduleRow>(
        pool,
        `INSERT INTO dca_schedules
         (user_address, from_asset, to_asset, amount_per_tick, frequency,
          day_of_week, day_of_month, hour_of_day, total_budget, remaining_budget,
          max_executions, end_condition, end_date, next_execution_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING *`,
        [
          input.userAddress,
          JSON.stringify(input.fromAsset),
          JSON.stringify(input.toAsset),
          input.amountPerTick,
          input.frequency,
          input.dayOfWeek ?? null,
          input.dayOfMonth ?? null,
          input.hourOfDay ?? 12,
          input.totalBudget ?? null,
          input.totalBudget ?? null,
          input.maxExecutions ?? null,
          input.endCondition ?? 'never',
          input.endDate ?? null,
          input.nextExecutionAt,
        ],
      );
      return res.rows[0]!;
    },

    async getScheduleById(id) {
      const res = await query<DCAScheduleRow>(pool, `SELECT * FROM dca_schedules WHERE id = $1`, [id]);
      return res.rows[0] ?? null;
    },

    async getSchedulesByUser(userAddress) {
      const res = await query<DCAScheduleRow>(
        pool,
        `SELECT * FROM dca_schedules WHERE user_address = $1 ORDER BY created_at DESC`,
        [userAddress],
      );
      return res.rows;
    },

    async getDueSchedules(now) {
      const res = await query<DCAScheduleRow>(
        pool,
        `SELECT * FROM dca_schedules WHERE status = 'active' AND next_execution_at <= $1`,
        [now],
      );
      return res.rows;
    },

    async updateSchedule(id, updates) {
      const sets: string[] = [];
      const vals: unknown[] = [];
      let idx = 1;

      if (updates.status !== undefined) { sets.push(`status = $${idx++}`); vals.push(updates.status); }
      if (updates.amountPerTick !== undefined) { sets.push(`amount_per_tick = $${idx++}`); vals.push(updates.amountPerTick); }
      if (updates.frequency !== undefined) { sets.push(`frequency = $${idx++}`); vals.push(updates.frequency); }
      if (updates.dayOfWeek !== undefined) { sets.push(`day_of_week = $${idx++}`); vals.push(updates.dayOfWeek); }
      if (updates.dayOfMonth !== undefined) { sets.push(`day_of_month = $${idx++}`); vals.push(updates.dayOfMonth); }
      if (updates.hourOfDay !== undefined) { sets.push(`hour_of_day = $${idx++}`); vals.push(updates.hourOfDay); }
      if (updates.totalBudget !== undefined) { sets.push(`total_budget = $${idx++}`); vals.push(updates.totalBudget); }
      if (updates.maxExecutions !== undefined) { sets.push(`max_executions = $${idx++}`); vals.push(updates.maxExecutions); }
      if (updates.endCondition !== undefined) { sets.push(`end_condition = $${idx++}`); vals.push(updates.endCondition); }
      if (updates.endDate !== undefined) { sets.push(`end_date = $${idx++}`); vals.push(updates.endDate); }
      if (updates.nextExecutionAt !== undefined) { sets.push(`next_execution_at = $${idx++}`); vals.push(updates.nextExecutionAt); }
      if (updates.consecutiveFailures !== undefined) { sets.push(`consecutive_failures = $${idx++}`); vals.push(updates.consecutiveFailures); }
      if (updates.totalExecutions !== undefined) { sets.push(`total_executions = $${idx++}`); vals.push(updates.totalExecutions); }
      if (updates.lastExecutedAt !== undefined) { sets.push(`last_executed_at = $${idx++}`); vals.push(updates.lastExecutedAt); }
      if (updates.remainingBudget !== undefined) { sets.push(`remaining_budget = $${idx++}`); vals.push(updates.remainingBudget); }

      if (sets.length === 0) return this.getScheduleById(id);
      vals.push(id);
      const res = await query<DCAScheduleRow>(
        pool,
        `UPDATE dca_schedules SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
        vals,
      );
      return res.rows[0] ?? null;
    },

    async pauseSchedule(id) {
      const res = await query<DCAScheduleRow>(
        pool,
        `UPDATE dca_schedules SET status = 'paused' WHERE id = $1 RETURNING *`,
        [id],
      );
      return res.rows[0] ?? null;
    },

    async resumeSchedule(id) {
      const res = await query<DCAScheduleRow>(
        pool,
        `UPDATE dca_schedules SET status = 'active', consecutive_failures = 0
         WHERE id = $1 AND status = 'paused' RETURNING *`,
        [id],
      );
      return res.rows[0] ?? null;
    },

    async deleteSchedule(id) {
      const res = await query(pool, `DELETE FROM dca_schedules WHERE id = $1`, [id]);
      return (res.rowCount ?? 0) > 0;
    },

    async createExecution(input) {
      const res = await query<DCAExecutionRow>(
        pool,
        `INSERT INTO dca_executions
         (dca_schedule_id, amount_in, amount_out, tx_hash, status, error, builder_code)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [
          input.dcaScheduleId,
          input.amountIn,
          input.amountOut ?? null,
          input.txHash ?? null,
          input.status,
          input.error ?? null,
          input.builderCode ?? null,
        ],
      );
      return res.rows[0]!;
    },

    async getExecutions(scheduleId, limit = 50) {
      const res = await query<DCAExecutionRow>(
        pool,
        `SELECT * FROM dca_executions WHERE dca_schedule_id = $1 ORDER BY executed_at DESC LIMIT $2`,
        [scheduleId, limit],
      );
      return res.rows;
    },

    async getScheduleStats(scheduleId) {
      const res = await query(
        pool,
        `SELECT
           COALESCE(SUM(CASE WHEN status='success' THEN amount_in::numeric ELSE 0 END), 0) as total_invested,
           COALESCE(SUM(CASE WHEN status='success' THEN amount_out::numeric ELSE 0 END), 0) as total_received,
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE status='success') as successful,
           COUNT(*) FILTER (WHERE status='failed') as failed
         FROM dca_executions WHERE dca_schedule_id = $1`,
        [scheduleId],
      );
      const row = res.rows[0]!;
      const invested = BigInt(String(row.total_invested));
      const received = BigInt(String(row.total_received));
      const avgPrice = received > 0n ? Number(invested * 1000000n / received) / 1000000 : 0;

      const schedRes = await query<DCAScheduleRow>(
        pool,
        `SELECT consecutive_failures FROM dca_schedules WHERE id = $1`,
        [scheduleId],
      );

      return {
        totalInvested: String(row.total_invested),
        totalReceived: String(row.total_received),
        avgPrice: avgPrice.toString(),
        totalExecutions: Number(row.total),
        successfulExecutions: Number(row.successful),
        failedExecutions: Number(row.failed),
        consecutiveFailures: schedRes.rows[0]?.consecutive_failures ?? 0,
      };
    },

    async incrementFailures(id) {
      await query(pool, `UPDATE dca_schedules SET consecutive_failures = consecutive_failures + 1 WHERE id = $1`, [id]);
    },

    async resetFailures(id) {
      await query(pool, `UPDATE dca_schedules SET consecutive_failures = 0 WHERE id = $1`, [id]);
    },
  };
}

const defaultStore: DCAStore = new InMemoryDCAStore();

export async function createDCASchedule(
  input: CreateDCAScheduleInput,
  store: DCAStore = defaultStore,
): Promise<DCAScheduleRow> {
  return store.createSchedule(input);
}

export async function getDueSchedules(
  now: string,
  store: DCAStore = defaultStore,
): Promise<DCAScheduleRow[]> {
  return store.getDueSchedules(now);
}

export async function updateSchedule(
  id: string,
  updates: UpdateDCAScheduleInput,
  store: DCAStore = defaultStore,
): Promise<DCAScheduleRow | null> {
  return store.updateSchedule(id, updates);
}

export async function pauseSchedule(
  id: string,
  store: DCAStore = defaultStore,
): Promise<DCAScheduleRow | null> {
  return store.pauseSchedule(id);
}

export async function resumeSchedule(
  id: string,
  store: DCAStore = defaultStore,
): Promise<DCAScheduleRow | null> {
  return store.resumeSchedule(id);
}

export async function deleteSchedule(
  id: string,
  store: DCAStore = defaultStore,
): Promise<boolean> {
  return store.deleteSchedule(id);
}

export async function getScheduleStats(
  id: string,
  store: DCAStore = defaultStore,
): Promise<DCAScheduleStats> {
  return store.getScheduleStats(id);
}
