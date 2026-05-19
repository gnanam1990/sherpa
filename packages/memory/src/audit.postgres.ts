/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 * Postgres-backed AuditStore. Mirrors the in-memory store one-for-one.
 *
 * Concurrency: `update()` reads the current `updated_at` then conditional
 * writes `WHERE id = $1 AND updated_at = $prev`. If another writer raced
 * us, rowCount is 0 and we throw `ConcurrentAuditUpdate`. Cheaper than row
 * locks; sufficient because each audit row has exactly two writers in the
 * critical path (creator + confirm callback).
 *
 * txHash patches *append*; txHashes patches *replace*. status, errorDetail,
 * confirmedAt, executedSteps overwrite. See audit.ts for the patch shape.
 */

import type pg from 'pg';
import { query } from '@sherpa/config';
import type {
  AuditLogPatch,
  AuditLogRow,
  AuditStore,
  CreateAuditLogInput,
  UserHistorySnapshot,
} from './audit.js';

export class ConcurrentAuditUpdate extends Error {
  constructor(public readonly id: number) {
    super(`[memory] audit row ${id} updated concurrently`);
    this.name = 'ConcurrentAuditUpdate';
  }
}

export class AuditRowNotFound extends Error {
  constructor(public readonly id: number) {
    super(`[memory] audit row ${id} not found`);
    this.name = 'AuditRowNotFound';
  }
}

type DbRow = {
  id: number | string;
  user_address: string;
  surface: string;
  raw_input: string;
  intent: string | null;
  plan_hash: string | null;
  parsed_intent: Record<string, unknown> | null;
  plan: Record<string, unknown> | null;
  executed_steps: Record<string, unknown> | null;
  tx_hashes: string[] | null;
  status: string;
  error_detail: string | null;
  submitted_at: Date;
  confirmed_at: Date | null;
  updated_at: Date;
};

function toRow(r: DbRow): AuditLogRow {
  const txHashes = (r.tx_hashes ?? []) as `0x${string}`[];
  const patch: Partial<AuditLogPatch> = {};
  if (txHashes.length > 0) {
    patch.txHashes = txHashes;
    patch.txHash = txHashes[0];
  }
  if (r.confirmed_at) patch.confirmedAt = r.confirmed_at.getTime();
  if (r.error_detail) patch.error = r.error_detail;
  patch.status = r.status as AuditLogPatch['status'];
  if (r.executed_steps) patch.executedSteps = r.executed_steps;
  return {
    id: typeof r.id === 'string' ? Number(r.id) : r.id,
    userAddress: r.user_address as `0x${string}`,
    intent: r.intent ?? '',
    planHash: r.plan_hash ?? '',
    submittedAt: r.submitted_at.getTime(),
    surface: r.surface as AuditLogRow['surface'],
    rawInput: r.raw_input,
    parsedIntent: r.parsed_intent ?? undefined,
    plan: r.plan ?? undefined,
    executedSteps: r.executed_steps ?? undefined,
    patch,
  };
}

export function createPostgresAuditStore(pool: pg.Pool): AuditStore {
  return {
    async create(input: CreateAuditLogInput): Promise<number> {
      const surface = input.surface ?? 'api';
      const rawInput = input.rawInput ?? '';
      const submittedAt = new Date(input.submittedAt);
      const result = await query<{ id: number | string }>(
        pool,
        `INSERT INTO audit_log (
           user_address, surface, raw_input, intent, plan_hash,
           parsed_intent, plan, executed_steps, submitted_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          input.userAddress,
          surface,
          rawInput,
          input.intent,
          input.planHash,
          input.parsedIntent ?? null,
          input.plan ?? null,
          input.executedSteps ?? null,
          submittedAt,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error('[memory] insert returned no id');
      return typeof row.id === 'string' ? Number(row.id) : row.id;
    },

    async update(id: number, patch: Partial<AuditLogPatch>): Promise<void> {
      const cur = await query<{ updated_at: Date }>(
        pool,
        'SELECT updated_at FROM audit_log WHERE id = $1',
        [id],
      );
      if (cur.rows.length === 0) throw new AuditRowNotFound(id);
      const prev = cur.rows[0]!.updated_at;

      // PG TIMESTAMPTZ stores microseconds; JS Date is millisecond-precision,
      // so the round-trip through the pg driver truncates. If we compared
      // raw `updated_at` here the WHERE clause would never match a row whose
      // stored timestamp has a non-zero µs component, and every concurrent
      // update path would throw `ConcurrentAuditUpdate`. Truncate both
      // sides to milliseconds — and write `updated_at` truncated too, so
      // every subsequent update keeps round-tripping cleanly.
      const sets: string[] = [`updated_at = date_trunc('milliseconds', NOW())`];
      const params: unknown[] = [id, prev];
      let p = params.length;

      if (patch.txHashes !== undefined) {
        sets.push(`tx_hashes = $${++p}`);
        params.push(patch.txHashes);
      } else if (patch.txHash !== undefined) {
        sets.push(`tx_hashes = array_append(tx_hashes, $${++p})`);
        params.push(patch.txHash);
      }
      if (patch.confirmedAt !== undefined) {
        sets.push(`confirmed_at = $${++p}`);
        params.push(new Date(patch.confirmedAt));
      }
      if (patch.error !== undefined) {
        sets.push(`error_detail = $${++p}`);
        params.push(patch.error);
      }
      if (patch.status !== undefined) {
        sets.push(`status = $${++p}`);
        params.push(patch.status);
      }
      if (patch.executedSteps !== undefined) {
        sets.push(`executed_steps = $${++p}`);
        params.push(patch.executedSteps);
      }

      const sql = `UPDATE audit_log SET ${sets.join(', ')}
                   WHERE id = $1
                     AND date_trunc('milliseconds', updated_at) = $2`;
      const res = await query(pool, sql, params);
      if (res.rowCount === 0) throw new ConcurrentAuditUpdate(id);
    },

    async list(userAddress: `0x${string}`): Promise<readonly AuditLogRow[]> {
      const res = await query<DbRow>(
        pool,
        `SELECT id, user_address, surface, raw_input, intent, plan_hash,
                parsed_intent, plan, executed_steps, tx_hashes, status,
                error_detail, submitted_at, confirmed_at, updated_at
           FROM audit_log
          WHERE LOWER(user_address) = LOWER($1)
          ORDER BY id ASC`,
        [userAddress],
      );
      return res.rows.map(toRow);
    },

    async snapshot(address: `0x${string}`): Promise<UserHistorySnapshot> {
      const res = await query<{ tx_count: number | string }>(
        pool,
        `SELECT COUNT(*)::int AS tx_count
           FROM audit_log
          WHERE LOWER(user_address) = LOWER($1)
            AND COALESCE(array_length(tx_hashes, 1), 0) > 0`,
        [address],
      );
      const row = res.rows[0];
      const count = row ? Number(row.tx_count) : 0;
      return { address, lastSeenBlock: 0, txCount: count };
    },
  };
}
