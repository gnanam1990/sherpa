import { describe, test, expect, vi } from 'vitest';
import {
  insertSwap,
  getSwapsByUser,
  getTotalSwapVolume,
  getTotalFeesCollected,
} from './swap-history.js';

function makePool(rows: unknown[] = []) {
  const queryFn = vi.fn().mockResolvedValue({ rows, rowCount: rows.length });
  return { query: queryFn, _queryFn: queryFn };
}

const sampleSwap = {
  userAddress: '0xABCDEF',
  tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  amountIn: '1000000',
  amountOut: '499000000000000000',
  feeCollected: '3000',
  txHash: '0x123abc',
  builderCode: 'sherpa-v1',
  slippageBps: 50,
};

describe('swap-history', () => {
  test('insertSwap builds correct INSERT with RETURNING', async () => {
    const row = { id: 'uuid-1', ...sampleSwap };
    const pool = makePool([row]) as any;
    const result = await insertSwap(pool, sampleSwap);
    expect(pool._queryFn).toHaveBeenCalledTimes(1);
    const sql = pool._queryFn.mock.calls[0][0] as string;
    expect(sql).toContain('INSERT INTO swap_history');
    expect(sql).toContain('RETURNING *');
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[0]).toBe('0xabcdef');
    expect(params[1]).toBe(8453);
    expect(params[7]).toBe('0x123abc');
  });

  test('insertSwap uses provided chainId', async () => {
    const pool = makePool([{}]) as any;
    await insertSwap(pool, { ...sampleSwap, chainId: 1 });
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[1]).toBe(1);
  });

  test('insertSwap defaults chainId to 8453', async () => {
    const pool = makePool([{}]) as any;
    await insertSwap(pool, sampleSwap);
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[1]).toBe(8453);
  });

  test('insertSwap includes route as JSON string', async () => {
    const pool = makePool([{}]) as any;
    await insertSwap(pool, { ...sampleSwap, route: { hops: 2 } });
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[11]).toBe('{"hops":2}');
  });

  test('insertSwap passes null for optional fields', async () => {
    const pool = makePool([{}]) as any;
    await insertSwap(pool, sampleSwap);
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[10]).toBeNull();
    expect(params[11]).toBeNull();
    expect(params[12]).toBeNull();
  });

  test('getSwapsByUser queries with lowercase address and limit', async () => {
    const pool = makePool([]) as any;
    await getSwapsByUser(pool, '0xABC', 25);
    const sql = pool._queryFn.mock.calls[0][0] as string;
    expect(sql).toContain('swap_history');
    expect(sql).toContain('ORDER BY created_at DESC');
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[0]).toBe('0xabc');
    expect(params[1]).toBe(25);
  });

  test('getSwapsByUser defaults limit to 50', async () => {
    const pool = makePool([]) as any;
    await getSwapsByUser(pool, '0xabc');
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[1]).toBe(50);
  });

  test('getTotalSwapVolume queries SUM without since filter', async () => {
    const pool = makePool([{ total: '9999' }]) as any;
    const result = await getTotalSwapVolume(pool);
    expect(result).toBe('9999');
    const sql = pool._queryFn.mock.calls[0][0] as string;
    expect(sql).toContain('SUM(amount_in)');
  });

  test('getTotalSwapVolume queries SUM with since filter', async () => {
    const since = new Date('2025-01-01');
    const pool = makePool([{ total: '5000' }]) as any;
    await getTotalSwapVolume(pool, since);
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[0]).toEqual(since);
  });

  test('getTotalFeesCollected returns total', async () => {
    const pool = makePool([{ total: '12345' }]) as any;
    const result = await getTotalFeesCollected(pool);
    expect(result).toBe('12345');
    const sql = pool._queryFn.mock.calls[0][0] as string;
    expect(sql).toContain('SUM(fee_collected)');
  });

  test('getTotalFeesCollected with since filter', async () => {
    const since = new Date('2025-06-01');
    const pool = makePool([{ total: '0' }]) as any;
    await getTotalFeesCollected(pool, since);
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[0]).toEqual(since);
  });
});
