import { describe, test, expect, vi } from 'vitest';
import {
  deactivateNotificationTokens,
  getActiveNotificationToken,
  listActiveTokens,
  saveNotificationToken,
} from './notification-tokens.js';

function makePool(rows: unknown[] = []) {
  const queryFn = vi.fn().mockResolvedValue({ rows, rowCount: rows.length });
  return { query: queryFn, _queryFn: queryFn };
}

describe('notification-tokens', () => {
  test('saveNotificationToken inserts with correct params', async () => {
    const pool = makePool() as any;
    await saveNotificationToken(pool, 12345n, 'tok123', 'https://farcaster.xyz', 'warpcast');
    expect(pool._queryFn).toHaveBeenCalledTimes(1);
    const sql = pool._queryFn.mock.calls[0][0] as string;
    expect(sql).toContain('notification_tokens');
    expect(sql).toContain('ON CONFLICT');
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[0]).toBe('12345');
    expect(params[1]).toBe('tok123');
    expect(params[2]).toBe('https://farcaster.xyz');
    expect(params[3]).toBe('warpcast');
  });

  test('deactivateNotificationTokens updates active to false', async () => {
    const pool = makePool() as any;
    await deactivateNotificationTokens(pool, 12345n);
    const sql = pool._queryFn.mock.calls[0][0] as string;
    expect(sql).toContain('UPDATE notification_tokens');
    expect(sql).toContain('active = false');
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[0]).toBe('12345');
  });

  test('listActiveTokens returns rows', async () => {
    const pool = makePool([{ fid: '1', token: 't', url: 'u', client: 'c' }]) as any;
    const result = await listActiveTokens(pool);
    expect(result).toHaveLength(1);
    expect(result[0].fid).toBe('1');
  });

  test('listActiveTokens returns empty array when no rows', async () => {
    const pool = makePool([]) as any;
    const result = await listActiveTokens(pool);
    expect(result).toHaveLength(0);
  });

  test('getActiveNotificationToken returns the active token for a fid', async () => {
    const pool = makePool([{ fid: '976779', token: 'tok', url: 'https://client.example', client: 'farcaster' }]) as any;
    const result = await getActiveNotificationToken(pool, 976779n);
    expect(result?.fid).toBe('976779');
    expect(result?.token).toBe('tok');
    const sql = pool._queryFn.mock.calls[0][0] as string;
    expect(sql).toContain('active = true');
    expect(pool._queryFn.mock.calls[0][1][0]).toBe('976779');
  });

  test('getActiveNotificationToken returns null when no active token exists', async () => {
    const pool = makePool([]) as any;
    await expect(getActiveNotificationToken(pool, 976779n)).resolves.toBeNull();
  });
});
