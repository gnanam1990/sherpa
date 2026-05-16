import { describe, test, expect, vi } from 'vitest';
import {
  linkFarcasterFid,
  getFarcasterLink,
  linkTelegramUser,
  getTelegramLink,
  createSigningToken,
  getSigningToken,
  consumeSigningToken,
  unlinkTelegramUser,
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

  test('linkFarcasterFid defaults verified to false', async () => {
    const pool = makePool() as any;
    await linkFarcasterFid(pool, 12345n, '0xABCDEF');
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[2]).toBe(false);
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

  test('getFarcasterLink lowercases address', async () => {
    const pool = makePool([{ smartwallet_address: '0xABC', verified: false }]) as any;
    const result = await getFarcasterLink(pool, 123n);
    expect(result?.address).toBe('0xabc');
  });

  test('linkTelegramUser inserts with correct params', async () => {
    const pool = makePool() as any;
    await linkTelegramUser(pool, 67890n, '0x1234', false);
    const sql = pool._queryFn.mock.calls[0][0] as string;
    expect(sql).toContain('telegram_user_links');
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[0]).toBe('67890');
  });

  test('linkTelegramUser defaults verified to false', async () => {
    const pool = makePool() as any;
    await linkTelegramUser(pool, 67890n, '0x1234');
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[2]).toBe(false);
  });

  test('getTelegramLink returns null when no row', async () => {
    const pool = makePool([]) as any;
    const result = await getTelegramLink(pool, 999n);
    expect(result).toBeNull();
  });

  test('getTelegramLink returns address and verified', async () => {
    const pool = makePool([{ smartwallet_address: '0x1234', verified: true }]) as any;
    const result = await getTelegramLink(pool, 67890n);
    expect(result).toEqual({ address: '0x1234', verified: true });
  });

  test('getTelegramLink lowercases address', async () => {
    const pool = makePool([{ smartwallet_address: '0xABCD', verified: false }]) as any;
    const result = await getTelegramLink(pool, 67890n);
    expect(result?.address).toBe('0xabcd');
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

  test('createSigningToken uses custom TTL', async () => {
    const pool = makePool() as any;
    const before = Date.now();
    const { expiresAt } = await createSigningToken(pool, {
      surface: 'telegram',
      surfaceUserId: '12345',
      intentPayload: {},
      ttlSeconds: 600,
    });
    const after = Date.now();
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + 600_000);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(after + 600_000);
  });

  test('createSigningToken default TTL is 300s', async () => {
    const pool = makePool() as any;
    const before = Date.now();
    const { expiresAt } = await createSigningToken(pool, {
      surface: 'telegram',
      surfaceUserId: '12345',
      intentPayload: {},
    });
    const after = Date.now();
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + 300_000);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(after + 300_000);
  });

  test('getSigningToken returns null for missing token', async () => {
    const pool = makePool([]) as any;
    const result = await getSigningToken(pool, 'nonexistent');
    expect(result).toBeNull();
  });

  test('getSigningToken returns token data', async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    const pool = makePool([
      {
        surface: 'telegram',
        surface_user_id: '12345',
        intent_payload: { intent: 'SEND' },
        expires_at: expiresAt,
        consumed_at: null,
      },
    ]) as any;
    const result = await getSigningToken(pool, 'tok123');
    expect(result).not.toBeNull();
    expect(result!.surface).toBe('telegram');
    expect(result!.surfaceUserId).toBe('12345');
    expect(result!.consumed).toBe(false);
  });

  test('getSigningToken marks consumed when consumed_at is set', async () => {
    const pool = makePool([
      {
        surface: 'telegram',
        surface_user_id: '12345',
        intent_payload: {},
        expires_at: new Date(),
        consumed_at: new Date(),
      },
    ]) as any;
    const result = await getSigningToken(pool, 'tok123');
    expect(result!.consumed).toBe(true);
  });

  test('consumeSigningToken throws when already consumed', async () => {
    const pool = makePool() as any;
    pool._queryFn.mockResolvedValueOnce({ rowCount: 0 });
    await expect(consumeSigningToken(pool, 'tok', '0xhash')).rejects.toThrow('already consumed');
  });

  test('consumeSigningToken succeeds', async () => {
    const pool = makePool() as any;
    pool._queryFn.mockResolvedValueOnce({ rowCount: 1 });
    await expect(consumeSigningToken(pool, 'tok', '0xhash')).resolves.toBeUndefined();
  });

  test('unlinkTelegramUser returns true when row deleted', async () => {
    const pool = makePool() as any;
    pool._queryFn.mockResolvedValueOnce({ rowCount: 1 });
    const result = await unlinkTelegramUser(pool, 12345n);
    expect(result).toBe(true);
    const sql = pool._queryFn.mock.calls[0][0] as string;
    expect(sql).toContain('DELETE FROM telegram_user_links');
    const params = pool._queryFn.mock.calls[0][1];
    expect(params[0]).toBe('12345');
  });

  test('unlinkTelegramUser returns false when no row', async () => {
    const pool = makePool() as any;
    pool._queryFn.mockResolvedValueOnce({ rowCount: 0 });
    const result = await unlinkTelegramUser(pool, 99999n);
    expect(result).toBe(false);
  });
});
