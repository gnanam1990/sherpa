import { describe, test, expect, vi } from 'vitest';
import { adminOnly } from './auth.js';

describe('adminOnly middleware', () => {
  test('allows admin user', async () => {
    process.env.ADMIN_TG_USER_IDS = '12345,67890';
    const ctx = {
      from: { id: 12345 },
      reply: vi.fn(),
    };
    const next = vi.fn();
    await adminOnly(ctx as any, next);
    expect(next).toHaveBeenCalledOnce();
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  test('blocks non-admin user', async () => {
    process.env.ADMIN_TG_USER_IDS = '12345';
    const ctx = {
      from: { id: 99999 },
      reply: vi.fn(),
    };
    const next = vi.fn();
    await adminOnly(ctx as any, next);
    expect(next).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledOnce();
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('private beta');
  });

  test('blocks when no admin IDs configured', async () => {
    process.env.ADMIN_TG_USER_IDS = '';
    const ctx = {
      from: { id: 12345 },
      reply: vi.fn(),
    };
    const next = vi.fn();
    await adminOnly(ctx as any, next);
    expect(next).not.toHaveBeenCalled();
  });

  test('blocks when ctx.from is missing', async () => {
    process.env.ADMIN_TG_USER_IDS = '12345';
    const ctx = {
      from: undefined,
      reply: vi.fn(),
    };
    const next = vi.fn();
    await adminOnly(ctx as any, next);
    expect(next).not.toHaveBeenCalled();
  });
});
