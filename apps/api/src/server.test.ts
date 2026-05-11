import { describe, it, expect, vi } from 'vitest';
import { loadConfig } from '@sherpa/config';
import { createInMemoryAuditStore, createInMemoryRateLimiter } from '@sherpa/memory';
import { _resetSentryForTests, type Logger, type SentryLike } from '@sherpa/logger';
import { buildServer } from './server.js';

const offlineConfig = { ...loadConfig(), useRealRpc: false } as const;

const USDC_RECIPIENT = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

function makeSentryStub(): SentryLike & {
  init: ReturnType<typeof vi.fn>;
  captureException: ReturnType<typeof vi.fn>;
  withScope: ReturnType<typeof vi.fn>;
  _scope: { setTag: ReturnType<typeof vi.fn>; setExtra: ReturnType<typeof vi.fn> };
} {
  const _scope = { setTag: vi.fn(), setExtra: vi.fn() };
  return {
    _scope,
    init: vi.fn(),
    captureException: vi.fn(),
    withScope: vi.fn((cb: (scope: typeof _scope) => void) => cb(_scope)),
  };
}

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

  it('logs uncaught route errors and returns an opaque 500', async () => {
    const err = new Error('provider exploded with secret-token-123');
    const logger: Logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn(() => logger),
    };
    const app = buildServer({
      config: offlineConfig,
      logger,
      llmComplete: async () => {
        throw err;
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/parse',
      payload: { input: 'please parse this unknown thing' },
    });

    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: 'internal_error' });
    expect(res.body).not.toContain('secret-token-123');
    expect(logger.error).toHaveBeenCalledWith(
      'uncaught route error',
      expect.objectContaining({
        err,
        method: 'POST',
        url: '/api/parse',
      }),
    );
    await app.close();
  });

  it('reports uncaught route errors to Sentry through the wrapped logger', async () => {
    const err = new Error('provider exploded with secret-token-123');
    const sentry = makeSentryStub();
    const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
    const app = buildServer({
      config: {
        ...offlineConfig,
        sentryDsn: 'https://example.com/1',
        sentryEnvironment: 'test',
      },
      sentry,
      llmComplete: async () => {
        throw err;
      },
    });

    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/parse',
        payload: { input: 'please parse this unknown thing' },
      });

      expect(res.statusCode).toBe(500);
      expect(res.json()).toEqual({ error: 'internal_error' });
      expect(res.body).not.toContain('secret-token-123');
      expect(sentry.captureException).toHaveBeenCalledWith(err);
      expect(sentry._scope.setTag).toHaveBeenCalledWith('surface', 'api');
      expect(sentry._scope.setExtra).toHaveBeenCalledWith('method', 'POST');
      expect(sentry._scope.setExtra).toHaveBeenCalledWith('url', '/api/parse');
    } finally {
      stderr.mockRestore();
      await app.close();
      _resetSentryForTests();
    }
  });

  it('preserves Fastify client errors without logging them as uncaught route errors', async () => {
    const logger: Logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn(() => logger),
    };
    const app = buildServer({ config: offlineConfig, logger });

    const res = await app.inject({
      method: 'POST',
      url: '/api/parse',
      headers: { 'content-type': 'application/json' },
      payload: '{',
    });

    expect(res.statusCode).toBe(400);
    expect(logger.error).not.toHaveBeenCalled();
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

  // ---- /admin/llm-usage ---------------------------------------------------
  // The success path (200 with aggregated rows) requires a live Postgres
  // pool and is exercised by the integration tests under @sherpa/memory.
  // Here we cover the four failure / disabled paths that the apps/api shell
  // owns: no key configured, missing bearer, wrong bearer, useRealDb=false,
  // malformed address.

  const ADMIN_KEY = 'a'.repeat(64);

  it('GET /admin/llm-usage/today returns 503 when ADMIN_API_KEY is unset', async () => {
    const app = buildServer({ config: { ...offlineConfig, adminApiKey: undefined } });
    const res = await app.inject({ method: 'GET', url: '/admin/llm-usage/today' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ error: expect.stringContaining('disabled') });
    await app.close();
  });

  it('GET /admin/llm-usage/today returns 401 on missing/wrong bearer', async () => {
    // Strip provider API keys so defaultLlmComplete returns undefined and
    // doesn't try to wire a real Postgres SpendCap. Inject in-memory audit
    // store so createAuditStore() doesn't reach for a pool either.
    const app = buildServer({
      config: {
        ...offlineConfig,
        openaiApiKey: undefined,
        groqApiKey: undefined,
        anthropicApiKey: undefined,
        adminApiKey: ADMIN_KEY,
        useRealDb: true,
      },
      auditStore: createInMemoryAuditStore(),
    });
    const noAuth = await app.inject({ method: 'GET', url: '/admin/llm-usage/today' });
    expect(noAuth.statusCode).toBe(401);
    const wrong = await app.inject({
      method: 'GET',
      url: '/admin/llm-usage/today',
      headers: { authorization: `Bearer ${'b'.repeat(64)}` },
    });
    expect(wrong.statusCode).toBe(401);
    await app.close();
  });

  it('GET /admin/llm-usage/today returns 401 for same-length non-ASCII bearer', async () => {
    const app = buildServer({
      config: {
        ...offlineConfig,
        openaiApiKey: undefined,
        groqApiKey: undefined,
        anthropicApiKey: undefined,
        adminApiKey: ADMIN_KEY,
        useRealDb: true,
      },
      auditStore: createInMemoryAuditStore(),
    });
    const res = await app.inject({
      method: 'GET',
      url: '/admin/llm-usage/today',
      headers: { authorization: `Bearer ${'é'.repeat(64)}` },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ error: 'invalid token' });
    await app.close();
  });

  it('GET /admin/llm-usage/today returns 503 when key is set but useRealDb=false (route disabled in dev)', async () => {
    const app = buildServer({
      config: { ...offlineConfig, adminApiKey: ADMIN_KEY, useRealDb: false },
    });
    const res = await app.inject({
      method: 'GET',
      url: '/admin/llm-usage/today',
      headers: { authorization: `Bearer ${ADMIN_KEY}` },
    });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({
      error: expect.stringContaining('SHERPA_USE_REAL_DB'),
    });
    await app.close();
  });

  // ---- /api/cron/hourly ---------------------------------------------------

  const CRON_SECRET = 'c'.repeat(64);

  it('POST /api/cron/hourly returns 503 when CRON_SECRET is unset', async () => {
    const app = buildServer({ config: { ...offlineConfig, cronSecret: undefined } });
    const res = await app.inject({ method: 'POST', url: '/api/cron/hourly' });
    expect(res.statusCode).toBe(503);
    await app.close();
  });

  it('POST /api/cron/hourly 401s on missing/wrong bearer', async () => {
    const app = buildServer({
      config: { ...offlineConfig, cronSecret: CRON_SECRET },
    });
    const noAuth = await app.inject({ method: 'POST', url: '/api/cron/hourly' });
    expect(noAuth.statusCode).toBe(401);
    const wrong = await app.inject({
      method: 'POST',
      url: '/api/cron/hourly',
      headers: { authorization: `Bearer ${'d'.repeat(64)}` },
    });
    expect(wrong.statusCode).toBe(401);
    await app.close();
  });

  it('POST /api/cron/hourly 401s on same-length non-ASCII bearer', async () => {
    const app = buildServer({
      config: { ...offlineConfig, cronSecret: CRON_SECRET },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/cron/hourly',
      headers: { authorization: `Bearer ${'é'.repeat(64)}` },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ error: 'invalid token' });
    await app.close();
  });

  it('POST /api/cron/hourly with empty registry returns 200 + empty tasks list', async () => {
    const app = buildServer({
      config: { ...offlineConfig, cronSecret: CRON_SECRET },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/cron/hourly',
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { ok: boolean; tasks: unknown[] };
    expect(body.ok).toBe(true);
    expect(body.tasks).toEqual([]);
    await app.close();
  });

  it('POST /api/cron/hourly captures task failures into audit_log without aborting other tasks', async () => {
    const auditStore = createInMemoryAuditStore();
    const app = buildServer({
      config: { ...offlineConfig, cronSecret: CRON_SECRET },
      auditStore,
      cronTasks: [
        {
          name: 'failing',
          run: async () => {
            throw new Error('upstream rpc 502');
          },
        },
        { name: 'ok', run: async () => ({ ok: true }) },
      ],
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/cron/hourly',
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { tasks: Array<{ name: string; status: string; error?: string }> };
    expect(body.tasks.map((t) => t.name)).toEqual(['failing', 'ok']);
    expect(body.tasks[0]!.status).toBe('failed');
    expect(body.tasks[0]!.error).toContain('upstream rpc 502');
    expect(body.tasks[1]!.status).toBe('success');
    // audit_log: one row per task, intent='CRON:<name>', surface='cron'
    const rows = await auditStore.list('0x0000000000000000000000000000000000000000');
    expect(rows.length).toBe(2);
    const intents = rows.map((r) => r.intent);
    expect(intents).toContain('CRON:failing');
    expect(intents).toContain('CRON:ok');
    expect(rows.every((r) => r.surface === 'cron')).toBe(true);
    const failedRow = rows.find((r) => r.intent === 'CRON:failing')!;
    expect(failedRow.patch.status).toBe('failed');
    expect(failedRow.patch.error).toContain('upstream rpc 502');
    await app.close();
  });

  it('POST /api/cron/hourly runs scheduler-shaped task results', async () => {
    const run = vi.fn(async () => ({ ok: true, detail: 'sample completed' }));
    const app = buildServer({
      config: { ...offlineConfig, cronSecret: CRON_SECRET },
      cronTasks: [{ name: 'sample', run }],
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/cron/hourly',
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { tasks: Array<{ name: string; status: string }> };
    expect(body.tasks).toEqual([{ name: 'sample', auditLogId: 1, status: 'success' }]);
    expect(run).toHaveBeenCalledTimes(1);
    await app.close();
  });

  it('GET /admin/llm-usage/user/:address rejects malformed addresses with 400 (after auth)', async () => {
    // Strip provider API keys so defaultLlmComplete returns undefined and
    // doesn't try to wire a real Postgres SpendCap. Inject in-memory audit
    // store so createAuditStore() doesn't reach for a pool either.
    const app = buildServer({
      config: {
        ...offlineConfig,
        openaiApiKey: undefined,
        groqApiKey: undefined,
        anthropicApiKey: undefined,
        adminApiKey: ADMIN_KEY,
        useRealDb: true,
      },
      auditStore: createInMemoryAuditStore(),
    });
    const res = await app.inject({
      method: 'GET',
      url: '/admin/llm-usage/user/not-an-address',
      headers: { authorization: `Bearer ${ADMIN_KEY}` },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});
