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

export interface HealthLogParams {
  userAddress: string;
  chainId?: number;
  healthFactor: number;
  totalCollateralBase: number;
  totalDebtBase: number;
  availableBorrowsBase?: number;
  ltv?: number;
  liquidationThreshold?: number;
}

export interface HealthLogRow {
  id: string;
  user_address: string;
  chain_id: number;
  health_factor: string;
  total_collateral_base: string;
  total_debt_base: string;
  available_borrows_base: string | null;
  ltv: string | null;
  liquidation_threshold: string | null;
  recorded_at: Date;
}

export async function logHealthFactor(
  pool: pg.Pool,
  params: HealthLogParams,
): Promise<HealthLogRow> {
  const res = await query<HealthLogRow>(
    pool,
    `INSERT INTO aave_health_log
       (user_address, chain_id, health_factor, total_collateral_base,
        total_debt_base, available_borrows_base, ltv, liquidation_threshold)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      params.userAddress.toLowerCase(),
      params.chainId ?? 8453,
      params.healthFactor,
      params.totalCollateralBase,
      params.totalDebtBase,
      params.availableBorrowsBase ?? null,
      params.ltv ?? null,
      params.liquidationThreshold ?? null,
    ],
  );
  return res.rows[0]!;
}

export async function getLatestHF(
  pool: pg.Pool,
  userAddress: string,
): Promise<HealthLogRow | null> {
  const res = await query<HealthLogRow>(
    pool,
    `SELECT * FROM aave_health_log
     WHERE user_address = $1
     ORDER BY recorded_at DESC
     LIMIT 1`,
    [userAddress.toLowerCase()],
  );
  return res.rows[0] ?? null;
}

export async function getHFHistory(
  pool: pg.Pool,
  userAddress: string,
  since: Date,
): Promise<HealthLogRow[]> {
  const res = await query<HealthLogRow>(
    pool,
    `SELECT * FROM aave_health_log
     WHERE user_address = $1 AND recorded_at >= $2
     ORDER BY recorded_at DESC`,
    [userAddress.toLowerCase(), since],
  );
  return res.rows;
}

export async function getUsersBelowHF(
  pool: pg.Pool,
  threshold: number,
): Promise<HealthLogRow[]> {
  const res = await query<HealthLogRow>(
    pool,
    `SELECT DISTINCT ON (user_address) *
     FROM aave_health_log
     WHERE health_factor < $1
     ORDER BY user_address, recorded_at DESC`,
    [threshold],
  );
  return res.rows;
}
