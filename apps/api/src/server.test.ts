import { describe, it, expect } from 'vitest';
import { loadConfig } from '@sherpa/config';
import { createInMemoryAuditStore, createInMemoryRateLimiter } from '@sherpa/memory';
import { buildServer } from './server.js';

const offlineConfig = { ...loadConfig(), useRealRpc: false } as const;

const USDC_RECIPIENT = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

describe('apps/api', () => {
  it('GET /api/health returns ok:true', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
    await app.close();
  });

  it('POST /api/parse returns a confirmation card for SEND', async () => {
    const app = buildServer();
    const res = await app.inject({
      method: 'POST',
      url: '/api/parse',
      payload: { input: `send 5 usdc to ${USDC_RECIPIENT}`, userKey: 'test' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { card?: { intent: string; steps: unknown[] } };
    expect(body.card?.intent).toBe('SEND');
    expect(body.card?.steps.length).toBe(1);
    await app.close();
  });

  it('POST /api/execute writes an audit log and returns the plan', async () => {
    const app = buildServer();
    const res = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: {
        input: `send 1 usdc to ${USDC_RECIPIENT}`,
        userAddress: USDC_RECIPIENT,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { ok: boolean; auditLogId: number; planHash: string };
    expect(body.ok).toBe(true);
    expect(body.auditLogId).toBeGreaterThan(0);
    expect(body.planHash).toMatch(/^0x[a-f0-9]{64}$/);
    await app.close();
  });

  it('POST /api/execute populates Stage-2 audit fields (surface, rawInput, parsedIntent, plan)', async () => {
    const auditStore = createInMemoryAuditStore();
    const app = buildServer({ auditStore });
    const input = `send 2 usdc to ${USDC_RECIPIENT}`;
    const res = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: { input, userAddress: USDC_RECIPIENT },
    });
    expect(res.statusCode).toBe(200);
    const rows = await auditStore.list(USDC_RECIPIENT);
    expect(rows.length).toBe(1);
    const row = rows[0]!;
    expect(row.surface).toBe('api');
    expect(row.rawInput).toBe(input);
    expect(row.parsedIntent?.intent).toBe('SEND');
    expect(row.plan).toBeDefined();
    await app.close();
  });

  it('POST /api/parse rejects empty input with 400', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'POST', url: '/api/parse', payload: { input: '' } });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('GET /api/balance/:addr routes through the injected resolver (Basename path)', async () => {
    // Stub resolver returning a basename-resolved address. Proves the
    // server hands non-direct inputs to createResolver, not the bare
    // dispatcher (which would return api_error: backend not configured).
    const stubAddress = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045';
    const app = buildServer({
      config: offlineConfig,
      resolver: async () => ({
        address: stubAddress as `0x${string}`,
        source: 'basename',
        display: 'jesse.base.eth',
        metadata: { basename: 'jesse.base.eth' },
      }),
    });
    const res = await app.inject({ method: 'GET', url: '/api/balance/jesse.base.eth' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { address: string; source: string; stage?: string };
    expect(body.address).toBe(stubAddress);
    expect(body.source).toBe('basename');
    expect(body.stage).toBe('stub');
    await app.close();
  });

  it('GET /api/balance/:addr resolves direct 0x addresses (offline)', async () => {
    const app = buildServer({ config: offlineConfig });
    const res = await app.inject({ method: 'GET', url: `/api/balance/${USDC_RECIPIENT}` });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { stage?: string; balances: { ETH: string; USDC: string } };
    expect(body.stage).toBe('stub');
    expect(body.balances.ETH).toBe('0');
    await app.close();
  });

  it('GET /api/history/:addr returns [] with emptyIndexer default', async () => {
    const app = buildServer({ config: offlineConfig });
    const res = await app.inject({ method: 'GET', url: `/api/history/${USDC_RECIPIENT}?limit=5` });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { items: unknown[] };
    expect(Array.isArray(body.items)).toBe(true);
    await app.close();
  });

  it('GET /api/history/:addr rejects non-numeric limit', async () => {
    const app = buildServer({ config: offlineConfig });
    const res = await app.inject({
      method: 'GET',
      url: `/api/history/${USDC_RECIPIENT}?limit=abc`,
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('shares a rate limiter across requests so Ring 3 actually bites', async () => {
    const rateLimiter = createInMemoryRateLimiter();
    // Drain the bucket (limit is 10/60s per executor.ts).
    for (let i = 0; i < 10; i += 1) await rateLimiter.check(USDC_RECIPIENT, 10, 60);
    const app = buildServer({ rateLimiter, config: offlineConfig });
    const res = await app.inject({
      method: 'POST',
      url: '/api/parse',
      payload: { input: `send 1 usdc to ${USDC_RECIPIENT}`, userKey: USDC_RECIPIENT },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { error?: string };
    expect(body.error).toMatch(/ring3_rate_limit/);
    await app.close();
  });

  it('POST /api/execute/:id/confirm rejects non-integer and non-positive ids', async () => {
    const app = buildServer();
    for (const bad of ['0', '-1', '1.5', 'abc']) {
      const res = await app.inject({
        method: 'POST',
        url: `/api/execute/${bad}/confirm`,
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    }
    await app.close();
  });

  it('POST /api/execute/:id/confirm returns 404 for unknown id', async () => {
    const app = buildServer();
    const res = await app.inject({
      method: 'POST',
      url: '/api/execute/9999/confirm',
      payload: { txHash: `0x${'a'.repeat(64)}` },
    });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('POST /api/execute/:id/confirm rejects malformed txHash', async () => {
    const app = buildServer();
    const res = await app.inject({
      method: 'POST',
      url: '/api/execute/1/confirm',
      payload: { txHash: 'not-a-hash' },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});
