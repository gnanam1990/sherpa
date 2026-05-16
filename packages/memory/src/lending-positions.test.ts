import { describe, test, expect, vi } from 'vitest';
import {
  insertLendingOp,
  getLendingHistoryByUser,
  getTotalSupplied,
} from './lending-positions.js';

function makePool(rows: unknown[] = []) {
  const queryFn = vi.fn().mockResolvedValue({ rows, rowCount: rows.length });
  return { query: queryFn, _queryFn: queryFn };
}

const supplyParams = {
  userAddress: '0xABCDEF',
  asset: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  operation: 'supply' as const,
  amount: '1000000',
  txHash: '0xlend1',
  builderCode: 'sherpa-v1',
};

const withdrawParams = {
  userAddress: '0xabcdef',
  asset: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  operation: 'withdraw' as const,
  amount: '500000',
  txHash: '0xlend2',
  builderCode: 'sherpa-v1',
};

describe('lending-positions', () => {
  test('insertLendingOp builds correct INSERT', async () => {
    const pool = makePool([{}]) as any;
    await insertLendingOp(pool, supplyParams);
    const sql = pool._queryFn.mock.calls[0][0] as string;
    expect(sql).toContain('INSERT INTO lending_positions');
    expect(sql).toContain('RETURNING *');
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[0]).toBe('0xabcdef');
    expect(params[3]).toBe('supply');
    expect(params[4]).toBe('1000000');
  });

  test('insertLendingOp defaults chainId to 8453', async () => {
    const pool = makePool([{}]) as any;
    await insertLendingOp(pool, supplyParams);
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[1]).toBe(8453);
  });

  test('insertLendingOp uses provided chainId', async () => {
    const pool = makePool([{}]) as any;
    await insertLendingOp(pool, { ...supplyParams, chainId: 137 });
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[1]).toBe(137);
  });

  test('insertLendingOp includes optional fields', async () => {
    const pool = makePool([{}]) as any;
    await insertLendingOp(pool, {
      ...supplyParams,
      atokenReceived: '999000',
      underlyingReturned: '998000',
      apyAtTime: 3.5,
      blockNumber: 123456,
    });
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[5]).toBe('999000');
    expect(params[6]).toBe('998000');
    expect(params[7]).toBe(3.5);
    expect(params[10]).toBe(123456);
  });

  test('insertLendingOp passes null for missing optional fields', async () => {
    const pool = makePool([{}]) as any;
    await insertLendingOp(pool, supplyParams);
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[5]).toBeNull();
    expect(params[6]).toBeNull();
    expect(params[7]).toBeNull();
    expect(params[10]).toBeNull();
  });

  test('getLendingHistoryByUser queries with lowercase address', async () => {
    const pool = makePool([]) as any;
    await getLendingHistoryByUser(pool, '0xABC', 10);
    const sql = pool._queryFn.mock.calls[0][0] as string;
    expect(sql).toContain('lending_positions');
    expect(sql).toContain('ORDER BY created_at DESC');
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[0]).toBe('0xabc');
    expect(params[1]).toBe(10);
  });

  test('getLendingHistoryByUser defaults limit to 50', async () => {
    const pool = makePool([]) as any;
    await getLendingHistoryByUser(pool, '0xabc');
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[1]).toBe(50);
  });

  test('getTotalSupplied computes supply minus withdraw', async () => {
    const pool = makePool([{ total: '500000' }]) as any;
    const result = await getTotalSupplied(pool, '0xabc', 'USDC');
    expect(result).toBe('500000');
    const sql = pool._queryFn.mock.calls[0][0] as string;
    expect(sql).toContain('CASE');
    expect(sql).toContain('supply');
    expect(sql).toContain('withdraw');
  });

  test('getTotalSupplied passes lowercase address and asset', async () => {
    const pool = makePool([{ total: '0' }]) as any;
    await getTotalSupplied(pool, '0xABC', '0xTOKEN');
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[0]).toBe('0xabc');
    expect(params[1]).toBe('0xTOKEN');
  });
});
