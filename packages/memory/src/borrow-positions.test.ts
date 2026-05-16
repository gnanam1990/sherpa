import { describe, test, expect, vi } from 'vitest';
import {
  insertBorrowOp,
  getBorrowHistoryByUser,
  getTotalBorrowed,
} from './borrow-positions.js';

function makePool(rows: unknown[] = []) {
  const queryFn = vi.fn().mockResolvedValue({ rows, rowCount: rows.length });
  return { query: queryFn, _queryFn: queryFn };
}

const borrowParams = {
  userAddress: '0xABCDEF',
  asset: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  operation: 'borrow' as const,
  amount: '500000',
  rateMode: 2 as const,
  txHash: '0xborrow1',
  builderCode: 'sherpa-v1',
};

const repayParams = {
  userAddress: '0xabcdef',
  asset: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  operation: 'repay' as const,
  amount: '250000',
  rateMode: 2 as const,
  txHash: '0xborrow2',
  builderCode: 'sherpa-v1',
};

describe('borrow-positions', () => {
  test('insertBorrowOp builds correct INSERT', async () => {
    const pool = makePool([{}]) as any;
    await insertBorrowOp(pool, borrowParams);
    const sql = pool._queryFn.mock.calls[0][0] as string;
    expect(sql).toContain('INSERT INTO borrow_positions');
    expect(sql).toContain('RETURNING *');
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[0]).toBe('0xabcdef');
    expect(params[3]).toBe('borrow');
    expect(params[4]).toBe('500000');
    expect(params[5]).toBe(2);
  });

  test('insertBorrowOp defaults chainId to 8453', async () => {
    const pool = makePool([{}]) as any;
    await insertBorrowOp(pool, borrowParams);
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[1]).toBe(8453);
  });

  test('insertBorrowOp uses provided chainId', async () => {
    const pool = makePool([{}]) as any;
    await insertBorrowOp(pool, { ...borrowParams, chainId: 42161 });
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[1]).toBe(42161);
  });

  test('insertBorrowOp includes health factor fields', async () => {
    const pool = makePool([{}]) as any;
    await insertBorrowOp(pool, {
      ...borrowParams,
      healthFactorBefore: 2.5,
      healthFactorAfter: 1.8,
      apyAtTime: 4.2,
    });
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[6]).toBe(4.2);
    expect(params[7]).toBe(2.5);
    expect(params[8]).toBe(1.8);
  });

  test('insertBorrowOp passes null for missing optional fields', async () => {
    const pool = makePool([{}]) as any;
    await insertBorrowOp(pool, borrowParams);
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[6]).toBeNull();
    expect(params[7]).toBeNull();
    expect(params[8]).toBeNull();
    expect(params[11]).toBeNull();
  });

  test('getBorrowHistoryByUser queries with lowercase address', async () => {
    const pool = makePool([]) as any;
    await getBorrowHistoryByUser(pool, '0xABC', 20);
    const sql = pool._queryFn.mock.calls[0][0] as string;
    expect(sql).toContain('borrow_positions');
    expect(sql).toContain('ORDER BY created_at DESC');
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[0]).toBe('0xabc');
    expect(params[1]).toBe(20);
  });

  test('getBorrowHistoryByUser defaults limit to 50', async () => {
    const pool = makePool([]) as any;
    await getBorrowHistoryByUser(pool, '0xabc');
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[1]).toBe(50);
  });

  test('getTotalBorrowed computes borrow minus repay', async () => {
    const pool = makePool([{ total: '250000' }]) as any;
    const result = await getTotalBorrowed(pool, '0xabc', 'USDC');
    expect(result).toBe('250000');
    const sql = pool._queryFn.mock.calls[0][0] as string;
    expect(sql).toContain('CASE');
    expect(sql).toContain('borrow');
    expect(sql).toContain('repay');
  });

  test('getTotalBorrowed passes lowercase address and asset', async () => {
    const pool = makePool([{ total: '0' }]) as any;
    await getTotalBorrowed(pool, '0xABC', '0xTOKEN');
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[0]).toBe('0xabc');
    expect(params[1]).toBe('0xTOKEN');
  });
});
