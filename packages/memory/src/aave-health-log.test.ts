import { describe, test, expect, vi } from 'vitest';
import {
  logHealthFactor,
  getLatestHF,
  getHFHistory,
  getUsersBelowHF,
} from './aave-health-log.js';

function makePool(rows: unknown[] = []) {
  const queryFn = vi.fn().mockResolvedValue({ rows, rowCount: rows.length });
  return { query: queryFn, _queryFn: queryFn };
}

const healthParams = {
  userAddress: '0xABCDEF',
  healthFactor: 1.85,
  totalCollateralBase: 10000,
  totalDebtBase: 5000,
};

describe('aave-health-log', () => {
  test('logHealthFactor builds correct INSERT', async () => {
    const pool = makePool([{}]) as any;
    await logHealthFactor(pool, healthParams);
    const sql = pool._queryFn.mock.calls[0][0] as string;
    expect(sql).toContain('INSERT INTO aave_health_log');
    expect(sql).toContain('RETURNING *');
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[0]).toBe('0xabcdef');
    expect(params[1]).toBe(8453);
    expect(params[2]).toBe(1.85);
    expect(params[3]).toBe(10000);
    expect(params[4]).toBe(5000);
  });

  test('logHealthFactor uses provided chainId', async () => {
    const pool = makePool([{}]) as any;
    await logHealthFactor(pool, { ...healthParams, chainId: 1 });
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[1]).toBe(1);
  });

  test('logHealthFactor includes optional fields', async () => {
    const pool = makePool([{}]) as any;
    await logHealthFactor(pool, {
      ...healthParams,
      availableBorrowsBase: 3000,
      ltv: 80,
      liquidationThreshold: 85,
    });
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[5]).toBe(3000);
    expect(params[6]).toBe(80);
    expect(params[7]).toBe(85);
  });

  test('logHealthFactor passes null for missing optional fields', async () => {
    const pool = makePool([{}]) as any;
    await logHealthFactor(pool, healthParams);
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[5]).toBeNull();
    expect(params[6]).toBeNull();
    expect(params[7]).toBeNull();
  });

  test('getLatestHF returns null when no row', async () => {
    const pool = makePool([]) as any;
    const result = await getLatestHF(pool, '0xabc');
    expect(result).toBeNull();
  });

  test('getLatestHF returns the latest row', async () => {
    const row = { id: '1', health_factor: '1.5' };
    const pool = makePool([row]) as any;
    const result = await getLatestHF(pool, '0xabc');
    expect(result).toEqual(row);
    const sql = pool._queryFn.mock.calls[0][0] as string;
    expect(sql).toContain('ORDER BY recorded_at DESC');
    expect(sql).toContain('LIMIT 1');
  });

  test('getLatestHF uses lowercase address', async () => {
    const pool = makePool([]) as any;
    await getLatestHF(pool, '0xABC');
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[0]).toBe('0xabc');
  });

  test('getHFHistory queries with since filter', async () => {
    const since = new Date('2025-01-01');
    const pool = makePool([]) as any;
    await getHFHistory(pool, '0xabc', since);
    const sql = pool._queryFn.mock.calls[0][0] as string;
    expect(sql).toContain('recorded_at >= $2');
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[0]).toBe('0xabc');
    expect(params[1]).toEqual(since);
  });

  test('getHFHistory returns rows ordered desc', async () => {
    const rows = [{ id: '1' }, { id: '2' }];
    const pool = makePool(rows) as any;
    const result = await getHFHistory(pool, '0xabc', new Date());
    expect(result).toHaveLength(2);
    const sql = pool._queryFn.mock.calls[0][0] as string;
    expect(sql).toContain('ORDER BY recorded_at DESC');
  });

  test('getUsersBelowHF queries with threshold', async () => {
    const pool = makePool([]) as any;
    await getUsersBelowHF(pool, 1.5);
    const sql = pool._queryFn.mock.calls[0][0] as string;
    expect(sql).toContain('health_factor < $1');
    expect(sql).toContain('DISTINCT ON (user_address)');
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[0]).toBe(1.5);
  });

  test('getUsersBelowHF returns latest row per user', async () => {
    const rows = [
      { user_address: '0x1', health_factor: '1.2' },
      { user_address: '0x2', health_factor: '1.4' },
    ];
    const pool = makePool(rows) as any;
    const result = await getUsersBelowHF(pool, 1.5);
    expect(result).toHaveLength(2);
  });
});
