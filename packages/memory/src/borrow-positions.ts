import type pg from 'pg';
import { query } from '@sherpa/config';

export interface BorrowOpParams {
  userAddress: string;
  chainId?: number;
  asset: string;
  operation: 'borrow' | 'repay';
  amount: string | number;
  rateMode: 1 | 2;
  apyAtTime?: number;
  healthFactorBefore?: number;
  healthFactorAfter?: number;
  txHash: string;
  builderCode: string;
  blockNumber?: number;
}

export interface BorrowPositionRow {
  id: string;
  user_address: string;
  chain_id: number;
  asset: string;
  operation: string;
  amount: string;
  rate_mode: number;
  apy_at_time: string | null;
  health_factor_before: string | null;
  health_factor_after: string | null;
  tx_hash: string;
  builder_code: string;
  block_number: string | null;
  created_at: Date;
}

export async function insertBorrowOp(
  pool: pg.Pool,
  params: BorrowOpParams,
): Promise<BorrowPositionRow> {
  const res = await query<BorrowPositionRow>(
    pool,
    `INSERT INTO borrow_positions
       (user_address, chain_id, asset, operation, amount,
        rate_mode, apy_at_time, health_factor_before, health_factor_after,
        tx_hash, builder_code, block_number)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      params.userAddress.toLowerCase(),
      params.chainId ?? 8453,
      params.asset,
      params.operation,
      params.amount,
      params.rateMode,
      params.apyAtTime ?? null,
      params.healthFactorBefore ?? null,
      params.healthFactorAfter ?? null,
      params.txHash,
      params.builderCode,
      params.blockNumber ?? null,
    ],
  );
  return res.rows[0]!;
}

export async function getBorrowHistoryByUser(
  pool: pg.Pool,
  userAddress: string,
  limit = 50,
): Promise<BorrowPositionRow[]> {
  const res = await query<BorrowPositionRow>(
    pool,
    `SELECT * FROM borrow_positions
     WHERE user_address = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userAddress.toLowerCase(), limit],
  );
  return res.rows;
}

export async function getTotalBorrowed(
  pool: pg.Pool,
  userAddress: string,
  asset: string,
): Promise<string> {
  const res = await query<{ total: string }>(
    pool,
    `SELECT COALESCE(SUM(
       CASE
         WHEN operation = 'borrow' THEN amount
         WHEN operation = 'repay' THEN -amount
         ELSE 0
       END
     ), 0) AS total
     FROM borrow_positions
     WHERE user_address = $1 AND asset = $2`,
    [userAddress.toLowerCase(), asset],
  );
  return res.rows[0]!.total;
}
