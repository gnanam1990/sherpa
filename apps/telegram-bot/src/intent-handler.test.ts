import { describe, test, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import { handleMessage, setupCallbackHandlers } from './intent-handler.js';
import { Bot } from 'grammy';

describe('Intent handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SHERPA_API_BASE = 'https://api.sherpa.example';
    process.env.SHERPA_WEB_BASE = 'https://sherpa-web.vercel.app';
  });

  test('handles unknown intent gracefully', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ parsed: { intent: 'UNKNOWN', slots: {} } }),
    });

    const ctx = {
      message: { text: 'blah blah' },
      reply: vi.fn(),
      replyWithChatAction: vi.fn(),
    };
    await handleMessage(ctx as any);
    expect(ctx.replyWithChatAction).toHaveBeenCalledWith('typing');
    expect(ctx.reply).toHaveBeenCalledOnce();
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain("didn't understand");
  });

  test('handles valid send intent', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        parsed: {
          intent: 'SEND',
          slots: { amount: '0.1', asset: 'ETH', recipient: 'vitalik.base.eth' },
        },
        card: {
          intent: 'SEND',
          primary_action_label: 'Send',
          primary_amount_display: '0.1 ETH',
          batch: {
            version: '1.0',
            chainId: '0x14a34',
            calls: [{ to: '0x0000000000000000000000000000000000000001', data: '0x', value: '0x0' }],
          },
        },
      }),
    });

    const ctx = {
      message: { text: 'send 0.1 ETH to vitalik.base.eth' },
      reply: vi.fn(),
      replyWithChatAction: vi.fn(),
    };
    await handleMessage(ctx as any);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.sherpa.example/api/parse',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(ctx.reply).toHaveBeenCalledOnce();
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('SEND');
    expect(ctx.reply.mock.calls[0]![1].reply_markup).toBeDefined();
  });

  test('renders read-only parse results without a signing link', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        parsed: { intent: 'BALANCE', slots: {} },
        card: {
          intent: 'BALANCE',
          primary_action_label: 'Show balance',
          primary_amount_display: 'Balance',
        },
      }),
    });

    const ctx = {
      message: { text: 'what is my balance' },
      reply: vi.fn(),
      replyWithChatAction: vi.fn(),
    };
    await handleMessage(ctx as any);
    const msg = ctx.reply.mock.calls[0]![0] as string;
    expect(msg).toContain('BALANCE');
    expect(msg).toContain('No wallet signature is needed');
  });

  test('skips command messages', async () => {
    const ctx = {
      message: { text: '/start' },
      reply: vi.fn(),
      replyWithChatAction: vi.fn(),
    };
    await handleMessage(ctx as any);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  test('setupCallbackHandlers registers without error', () => {
    const bot = new Bot('fake-token');
    expect(() => setupCallbackHandlers(bot)).not.toThrow();
  });
});
