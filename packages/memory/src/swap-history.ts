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

export interface SwapParams {
  userAddress: string;
  chainId?: number;
  tokenIn: string;
  tokenOut: string;
  amountIn: string | number;
  amountOut: string | number;
  feeCollected: string | number;
  txHash: string;
  builderCode: string;
  slippageBps: number;
  priceImpactBps?: number;
  route?: unknown;
  blockNumber?: number;
}

export interface SwapRow {
  id: string;
  user_address: string;
  chain_id: number;
  token_in: string;
  token_out: string;
  amount_in: string;
  amount_out: string;
  fee_collected: string;
  tx_hash: string;
  builder_code: string;
  slippage_bps: number;
  price_impact_bps: number | null;
  route: unknown;
  block_number: string | null;
  created_at: Date;
}

export async function insertSwap(pool: pg.Pool, params: SwapParams): Promise<SwapRow> {
  const res = await query<SwapRow>(
    pool,
    `INSERT INTO swap_history
       (user_address, chain_id, token_in, token_out, amount_in, amount_out,
        fee_collected, tx_hash, builder_code, slippage_bps, price_impact_bps,
        route, block_number)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      params.userAddress.toLowerCase(),
      params.chainId ?? 8453,
      params.tokenIn,
      params.tokenOut,
      params.amountIn,
      params.amountOut,
      params.feeCollected,
      params.txHash,
      params.builderCode,
      params.slippageBps,
      params.priceImpactBps ?? null,
      params.route ? JSON.stringify(params.route) : null,
      params.blockNumber ?? null,
    ],
  );
  return res.rows[0]!;
}

export async function getSwapsByUser(
  pool: pg.Pool,
  userAddress: string,
  limit = 50,
): Promise<SwapRow[]> {
  const res = await query<SwapRow>(
    pool,
    `SELECT * FROM swap_history
     WHERE user_address = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userAddress.toLowerCase(), limit],
  );
  return res.rows;
}

export async function getTotalSwapVolume(
  pool: pg.Pool,
  since?: Date,
): Promise<string> {
  const res = await query<{ total: string }>(
    pool,
    `SELECT COALESCE(SUM(amount_in), 0) AS total FROM swap_history
     WHERE ($1::timestamptz IS NULL OR created_at >= $1)`,
    [since ?? null],
  );
  return res.rows[0]!.total;
}

export async function getTotalFeesCollected(
  pool: pg.Pool,
  since?: Date,
): Promise<string> {
  const res = await query<{ total: string }>(
    pool,
    `SELECT COALESCE(SUM(fee_collected), 0) AS total FROM swap_history
     WHERE ($1::timestamptz IS NULL OR created_at >= $1)`,
    [since ?? null],
  );
  return res.rows[0]!.total;
}
