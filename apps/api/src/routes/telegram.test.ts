import { describe, it, expect } from 'vitest';
import { loadConfig } from '@sherpa/config';
import { buildServer } from '../server.js';

function offlineConfig() {
  return { ...loadConfig(), useRealRpc: false } as const;
}

describe('Telegram API routes', () => {
  it('POST /api/telegram/sign-intent returns signing URL', async () => {
    const app = buildServer({ config: offlineConfig() });
    const res = await app.inject({
      method: 'POST',
      url: '/api/telegram/sign-intent',
      payload: { intent: 'SEND', params: { amount: '0.1', asset: 'ETH' }, tgUserId: 12345 },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.url).toBeDefined();
    expect(body.url).toContain('/sign');
    expect(body.expiresAt).toBeDefined();
    await app.close();
  });

  it('POST /api/telegram/sign-intent rejects invalid body', async () => {
    const app = buildServer({ config: offlineConfig() });
    const res = await app.inject({
      method: 'POST',
      url: '/api/telegram/sign-intent',
      payload: { intent: '' },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('POST /api/telegram/tx-confirmed returns ok', async () => {
    const app = buildServer({ config: offlineConfig() });
    const res = await app.inject({
      method: 'POST',
      url: '/api/telegram/tx-confirmed',
      payload: { token: 'test-token', txHash: '0xabc123' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    await app.close();
  });
});
