import { describe, it, expect } from 'vitest';
import { loadConfig } from '@sherpa/config';
import { buildServer } from '../server.js';

function offlineConfig() {
  return { ...loadConfig(), useRealRpc: false } as const;
}

describe('POST /api/webhooks/farcaster', () => {
  it('accepts frame_added event', async () => {
    const app = buildServer({ config: offlineConfig() });
    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/farcaster',
      payload: { type: 'frame_added', fid: 1234 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    await app.close();
  });

  it('accepts frame_removed event', async () => {
    const app = buildServer({ config: offlineConfig() });
    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/farcaster',
      payload: { type: 'frame_removed', fid: 1234 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    await app.close();
  });

  it('accepts notifications_enabled event', async () => {
    const app = buildServer({ config: offlineConfig() });
    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/farcaster',
      payload: { type: 'notifications_enabled', fid: 5678 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    await app.close();
  });

  it('accepts unknown event types gracefully', async () => {
    const app = buildServer({ config: offlineConfig() });
    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/farcaster',
      payload: { type: 'unknown_event', fid: 9999 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    await app.close();
  });
});

describe('GET /api/farcaster/frame', () => {
  it('returns frame metadata', async () => {
    const app = buildServer({ config: offlineConfig() });
    const res = await app.inject({
      method: 'GET',
      url: '/api/farcaster/frame',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.name).toBe('Sherpa');
    expect(body.splashBackgroundColor).toBe('#0052FF');
    expect(body.homeUrl).toBe('https://sherpa-mini.vercel.app');
    await app.close();
  });
});
