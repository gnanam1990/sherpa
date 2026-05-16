import { describe, test, expect, vi, beforeEach } from 'vitest';
import { handleStart, handleHelp, handleBalance, handleHistory, handleLink } from './commands.js';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

describe('Telegram bot commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SHERPA_API_BASE = 'https://api.sherpa.example';
    process.env.SHERPA_WEB_BASE = 'https://sherpa-web.vercel.app';
  });

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

  test('handleBalance shows linked wallet', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ address: '0x1234', verified: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          chain: 'base-sepolia',
          balances: { ETH: '0.01', USDC: '5.00' },
        }),
      });

    const ctx = {
      reply: vi.fn(),
      from: { id: 12345 },
    };
    await handleBalance(ctx as any);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.sherpa.example/api/surfaces/telegram/12345',
    );
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://api.sherpa.example/api/balance/0x1234');
    expect(ctx.reply).toHaveBeenCalledOnce();
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('0x1234');
    expect(msg).toContain('ETH: 0.01');
    expect(msg).toContain('USDC: 5.00');
  });

  test('handleBalance prompts link when not linked', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false });

    const ctx = {
      reply: vi.fn(),
      from: { id: 12345 },
    };
    await handleBalance(ctx as any);
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('Not linked');
  });

  test('handleHistory shows wallet address', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ address: '0x1234', verified: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          chain: 'base-sepolia',
          items: [
            {
              txHash: `0x${'a'.repeat(64)}`,
              direction: 'out',
              asset: 'USDC',
              amountDisplay: '1',
              counterparty: '0xabcd',
              sherpaIntent: 'SEND',
            },
          ],
        }),
      });

    const ctx = {
      reply: vi.fn(),
      from: { id: 12345 },
    };
    await handleHistory(ctx as any);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.sherpa.example/api/history/0x1234?limit=5',
    );
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('Recent transactions on base-sepolia');
    expect(msg).toContain('OUT 1 USDC to 0xabcd');
    expect(msg).toContain('Intent: SEND');
  });

  test('handleLink calls sign-intent API', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: 'tok123',
        signUrl: 'https://sherpa-web.vercel.app/sign?token=tok123',
      }),
    });

    const ctx = {
      reply: vi.fn(),
      from: { id: 12345 },
    };
    await handleLink(ctx as any);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.sherpa.example/api/surfaces/sign-intent',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(ctx.reply).toHaveBeenCalledOnce();
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('tok123');
  });

  test('handleLink shows error on API failure', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false });

    const ctx = {
      reply: vi.fn(),
      from: { id: 12345 },
    };
    await handleLink(ctx as any);
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('Failed to generate link');
  });
});
