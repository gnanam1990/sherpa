import { describe, it, expect } from 'vitest';
import { loadConfig } from '@sherpa/config';
import { buildServer } from '../server.js';

function offlineConfig() {
  return { ...loadConfig(), useRealRpc: false } as const;
}

function encodeBase64Url(str: string): string {
  return Buffer.from(str, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

describe('POST /api/webhooks/farcaster', () => {
  it('accepts frame_added event (flat format)', async () => {
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

  it('accepts current hyphenated miniapp event names', async () => {
    const app = buildServer({ config: offlineConfig() });
    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/farcaster',
      payload: { event: 'miniapp-added', fid: 1234 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    await app.close();
  });

  it('accepts frame_added event (JFS format)', async () => {
    const app = buildServer({ config: offlineConfig() });
    const header = encodeBase64Url(JSON.stringify({ fid: 5678 }));
    const payload = encodeBase64Url(JSON.stringify({ event: 'frame_added', fid: 5678 }));
    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/farcaster',
      payload: {
        header,
        payload,
        signature: 'sig',
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    await app.close();
  });

  it('accepts JFS format with FID in the header', async () => {
    const app = buildServer({ config: offlineConfig() });
    const header = encodeBase64Url(JSON.stringify({ fid: 976779 }));
    const payload = encodeBase64Url(JSON.stringify({ event: 'notifications-enabled' }));
    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/farcaster',
      payload: {
        header,
        payload,
        signature: 'sig',
      },
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
    await app.close();
  });

  it('accepts notifications_disabled event', async () => {
    const app = buildServer({ config: offlineConfig() });
    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/farcaster',
      payload: { type: 'notifications_disabled', fid: 9999 },
    });
    expect(res.statusCode).toBe(200);
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
    await app.close();
  });

  it('rejects empty body', async () => {
    const app = buildServer({ config: offlineConfig() });
    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/farcaster',
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('rejects invalid JFS payload encoding', async () => {
    const app = buildServer({ config: offlineConfig() });
    const res = await app.inject({
      method: 'POST',
      url: '/api/webhooks/farcaster',
      payload: {
        header: 'hdr',
        payload: '!!!invalid-base64!!!',
        signature: 'sig',
      },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});

describe('GET /api/farcaster/notifications/:fid/status', () => {
  it('rejects invalid FIDs', async () => {
    const app = buildServer({ config: offlineConfig() });
    const res = await app.inject({
      method: 'GET',
      url: '/api/farcaster/notifications/not-a-fid/status',
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('reports inactive status without exposing token data in process-memory mode', async () => {
    const app = buildServer({ config: offlineConfig() });
    const res = await app.inject({
      method: 'GET',
      url: '/api/farcaster/notifications/976779/status',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      active: false,
      fid: '976779',
      persistence: 'process-memory',
    });
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
    await app.close();
  });
});
