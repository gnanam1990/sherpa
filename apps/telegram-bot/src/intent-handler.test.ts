import { describe, test, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import { handleMessage } from './intent-handler.js';

describe('Intent handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SHERPA_API_BASE = 'https://api.sherpa.example';
  });

  test('handles unknown intent gracefully', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ intent: 'UNKNOWN', params: {} }),
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
        intent: 'SEND',
        params: { amount: '0.1', asset: 'ETH', recipient: 'vitalik.base.eth' },
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
});
