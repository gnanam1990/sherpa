import { describe, test, expect, vi } from 'vitest';
import {
  linkFarcasterFid,
  getFarcasterLink,
  linkTelegramUser,
  getTelegramLink,
  createSigningToken,
  getSigningToken,
  consumeSigningToken,
} from './surface-links.js';

function makePool(rows: unknown[] = []) {
  const queryFn = vi.fn().mockResolvedValue({ rows, rowCount: rows.length });
  return { query: queryFn, _queryFn: queryFn };
}

describe('surface-links', () => {
  test('linkFarcasterFid inserts with correct params', async () => {
    const pool = makePool() as any;
    await linkFarcasterFid(pool, 12345n, '0xABCDEF', true);
    expect(pool._queryFn).toHaveBeenCalledTimes(1);
    const sql = pool._queryFn.mock.calls[0][0] as string;
    expect(sql).toContain('fid_smartwallet_links');
    expect(sql).toContain('ON CONFLICT');
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[0]).toBe('12345');
    expect(params[1]).toBe('0xabcdef');
    expect(params[2]).toBe(true);
  });

  test('getFarcasterLink returns null when no row', async () => {
    const pool = makePool([]) as any;
    const result = await getFarcasterLink(pool, 999n);
    expect(result).toBeNull();
  });

  test('getFarcasterLink returns address and verified', async () => {
    const pool = makePool([{ smartwallet_address: '0xabc', verified: true }]) as any;
    const result = await getFarcasterLink(pool, 123n);
    expect(result).toEqual({ address: '0xabc', verified: true });
  });

  test('linkTelegramUser inserts with correct params', async () => {
    const pool = makePool() as any;
    await linkTelegramUser(pool, 67890n, '0x1234', false);
    const sql = pool._queryFn.mock.calls[0][0] as string;
    expect(sql).toContain('telegram_user_links');
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[0]).toBe('67890');
  });

  test('getTelegramLink returns null when no row', async () => {
    const pool = makePool([]) as any;
    const result = await getTelegramLink(pool, 999n);
    expect(result).toBeNull();
  });

  test('createSigningToken generates 64-char hex token', async () => {
    const pool = makePool() as any;
    const { token, expiresAt } = await createSigningToken(pool, {
      surface: 'telegram',
      surfaceUserId: '12345',
      intentPayload: { intent: 'SEND' },
    });
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  test('getSigningToken returns null for missing token', async () => {
    const pool = makePool([]) as any;
    const result = await getSigningToken(pool, 'nonexistent');
    expect(result).toBeNull();
  });

  test('consumeSigningToken throws when already consumed', async () => {
    const pool = makePool() as any;
    pool._queryFn.mockResolvedValueOnce({ rowCount: 0 });
    await expect(consumeSigningToken(pool, 'tok', '0xhash')).rejects.toThrow('already consumed');
  });
});
