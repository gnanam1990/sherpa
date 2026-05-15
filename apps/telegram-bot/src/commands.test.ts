import { describe, test, expect, vi } from 'vitest';
import { handleStart, handleHelp, handleLink } from './commands.js';

describe('Telegram bot commands', () => {
  test('handleStart sends welcome message', async () => {
    const ctx = {
      reply: vi.fn(),
      from: { id: 12345 },
    };
    await handleStart(ctx as any);
    expect(ctx.reply).toHaveBeenCalledOnce();
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('Welcome to Sherpa');
    expect(msg).toContain('/send');
    expect(msg).toContain('/balance');
    expect(msg).toContain('/history');
    expect(msg).toContain('/link');
  });

  test('handleHelp lists all commands', async () => {
    const ctx = { reply: vi.fn() };
    await handleHelp(ctx as any);
    expect(ctx.reply).toHaveBeenCalledOnce();
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('/send');
    expect(msg).toContain('/balance');
    expect(msg).toContain('/history');
    expect(msg).toContain('/link');
    expect(msg).toContain('natural language');
  });

  test('handleLink generates wallet link URL with tg user id', async () => {
    const ctx = {
      reply: vi.fn(),
      from: { id: 12345 },
    };
    await handleLink(ctx as any);
    expect(ctx.reply).toHaveBeenCalledOnce();
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('tg=12345');
    expect(msg).toContain('/link');
  });
});
