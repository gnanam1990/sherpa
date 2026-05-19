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

export interface LendingOpParams {
  userAddress: string;
  chainId?: number;
  asset: string;
  operation: 'supply' | 'withdraw';
  amount: string | number;
  atokenReceived?: string | number;
  underlyingReturned?: string | number;
  apyAtTime?: number;
  txHash: string;
  builderCode: string;
  blockNumber?: number;
}

export interface LendingPositionRow {
  id: string;
  user_address: string;
  chain_id: number;
  asset: string;
  operation: string;
  amount: string;
  atoken_received: string | null;
  underlying_returned: string | null;
  apy_at_time: string | null;
  tx_hash: string;
  builder_code: string;
  block_number: string | null;
  created_at: Date;
}

export async function insertLendingOp(
  pool: pg.Pool,
  params: LendingOpParams,
): Promise<LendingPositionRow> {
  const res = await query<LendingPositionRow>(
    pool,
    `INSERT INTO lending_positions
       (user_address, chain_id, asset, operation, amount,
        atoken_received, underlying_returned, apy_at_time,
        tx_hash, builder_code, block_number)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      params.userAddress.toLowerCase(),
      params.chainId ?? 8453,
      params.asset,
      params.operation,
      params.amount,
      params.atokenReceived ?? null,
      params.underlyingReturned ?? null,
      params.apyAtTime ?? null,
      params.txHash,
      params.builderCode,
      params.blockNumber ?? null,
    ],
  );
  return res.rows[0]!;
}

export async function getLendingHistoryByUser(
  pool: pg.Pool,
  userAddress: string,
  limit = 50,
): Promise<LendingPositionRow[]> {
  const res = await query<LendingPositionRow>(
    pool,
    `SELECT * FROM lending_positions
     WHERE user_address = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userAddress.toLowerCase(), limit],
  );
  return res.rows;
}

export async function getTotalSupplied(
  pool: pg.Pool,
  userAddress: string,
  asset: string,
): Promise<string> {
  const res = await query<{ total: string }>(
    pool,
    `SELECT COALESCE(SUM(
       CASE
         WHEN operation = 'supply' THEN amount
         WHEN operation = 'withdraw' THEN -amount
         ELSE 0
       END
     ), 0) AS total
     FROM lending_positions
     WHERE user_address = $1 AND asset = $2`,
    [userAddress.toLowerCase(), asset],
  );
  return res.rows[0]!.total;
}
