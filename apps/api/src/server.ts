import Fastify, { type FastifyInstance } from 'fastify';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import * as Sentry from '@sentry/node';
import { loadConfig, type SherpaConfig } from '@sherpa/config';
import { createLogger, initSentry, type Logger, type SentryLike } from '@sherpa/logger';
import {
  parseDeterministic,
  parseWithLLM,
  plan,
  type ConfirmationCardProps,
  type LLMComplete,
} from '@sherpa/core';
import { anthropicProvider, createRouter, groqProvider, openaiProvider } from '@sherpa/llm';
import { createResolver, isResolved, type IdentityResolver } from '@sherpa/identity';
import { kv } from '@vercel/kv';
import {
  createAuditLog,
  createAuditStore,
  createInMemoryRateLimiter,
  createPaymasterRateLimiter,
  createSpendCap,
  createUsageSink,
  fetchTodayUsage,
  fetchUserUsage,
  updateAuditLog,
  type AuditStore,
  type PaymasterRateLimiter,
  type RateLimiter,
} from '@sherpa/memory';
import { getPool, query } from '@sherpa/config';
import { timingSafeEqual } from 'node:crypto';
import { HOURLY_TASKS, type HourlyTask } from '@sherpa/scheduler';
import { alertRoutes } from './routes/alerts.js';
import { autoRepayRoutes } from './routes/auto-repay.js';
import { dcaRoutes } from './routes/dca.js';
import { sessionKeyRoutes } from './routes/session-keys.js';
import { strategyRoutes } from './routes/strategies.js';
import { registerCronRoutes } from './routes/cron.js';
import { registerFarcasterRoutes } from './routes/farcaster.js';
import { registerPaymasterRoutes } from './routes/paymaster.js';
import { registerTelegramRoutes } from './routes/telegram.js';
import {
  createBasescanIndexer,
  emptyIndexer,
  fetchBalance,
  getPublicClient,
  type HistoryIndexer,
} from '@sherpa/tools';

/**
 * Week-2 API shell. Real handlers back onto `@sherpa/core` and
 * `@sherpa/identity`. No LLM calls yet — parser is deterministic.
 */

const parseBody = z.object({
  input: z.string().min(1).max(500),
  userKey: z.string().optional(),
});

const executeBody = z.object({
  input: z.string().min(1).max(500),
  userAddress: z.custom<`0x${string}`>(
    (v) => typeof v === 'string' && /^0x[a-fA-F0-9]{40}$/.test(v),
    { message: 'userAddress must be 0x-prefixed 20-byte hex' },
  ),
});

const confirmBody = z.object({
  txHash: z
    .custom<`0x${string}`>((v) => typeof v === 'string' && /^0x[a-fA-F0-9]{64}$/.test(v), { message: 'txHash must be 0x-prefixed 32-byte hex' })
    .optional(),
  error: z.string().max(500).optional(),
});

export type BuildServerOptions = {
  auditStore?: AuditStore;
  rateLimiter?: RateLimiter;
  indexer?: HistoryIndexer;
  config?: SherpaConfig;
  /** Override LLM completion (tests inject a mock). */
  llmComplete?: LLMComplete;
  /** Override identity resolver (tests inject a stub; production uses createResolver). */
  resolver?: IdentityResolver;
  /**
   * Override the Sentry SDK (tests pass a vi.fn-backed stub). Production
   * uses `@sentry/node`. When neither is set AND no DSN is configured,
   * initSentry is a no-op.
   */
  sentry?: SentryLike;
  /** Override the logger (tests usually let the default rip and assert on stdout). */
  logger?: Logger;
  /** Override the cron task registry (tests inject failing tasks). */
  cronTasks?: readonly HourlyTask[];
  /** Override the paymaster rate limiter (tests script consume/refund). */
  paymasterRateLimiter?: PaymasterRateLimiter;
  /** Override fetch for the paymaster proxy (tests assert request shape). */
  paymasterFetch?: typeof globalThis.fetch;
};

/**
 * Construct the production resolver. Engages the Vercel KV layer only
 * when both KV creds are present in config; otherwise the LRU is the
 * sole cache. `@vercel/kv`'s singleton reads `KV_REST_API_URL` /
 * `KV_REST_API_TOKEN` from the environment automatically.
 */
function defaultResolver(config: SherpaConfig): IdentityResolver {
  const kvLayer = config.kvRestApiUrl && config.kvRestApiToken ? kv : undefined;
  return createResolver({ config, kv: kvLayer });
}

function defaultLlmComplete(config: SherpaConfig): LLMComplete | undefined {
  const providers: Parameters<typeof createRouter>[0]['providers'] = {};
  if (config.openaiApiKey)
    providers['gpt-4o-mini'] = openaiProvider({ apiKey: config.openaiApiKey });
  if (config.groqApiKey) providers['groq-llama'] = groqProvider({ apiKey: config.groqApiKey });
  if (config.anthropicApiKey)
    providers['claude-haiku'] = anthropicProvider({ apiKey: config.anthropicApiKey });
  if (Object.keys(providers).length === 0) return undefined;
  // Cap counter (in-memory or Postgres, depending on useRealDb) gates every
  // call. UsageSink writes per-call rows when we're on Postgres; in-memory
  // mode skips the sink entirely (returns undefined → router treats as no-op).
  const router = createRouter({
    providers,
    spendCap: createSpendCap(config),
    onUsage: createUsageSink(config),
  });
  return (req) => router.complete(req);
}

/**
 * Constant-time bearer-token check. `Authorization: Bearer <hex>` only; any
 * other scheme or shape is rejected. Returns 503 (not 401) when the server
 * has no admin key configured — the route is *disabled*, not mis-authed.
 */
function checkAdminAuth(
  authHeader: string | undefined,
  configured: string | undefined,
): { ok: true } | { ok: false; status: 401 | 503; reason: string } {
  if (!configured) return { ok: false, status: 503, reason: 'admin endpoints disabled' };
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, status: 401, reason: 'missing bearer token' };
  }
  const supplied = authHeader.slice('Bearer '.length).trim();
  const suppliedBytes = Buffer.from(supplied);
  const configuredBytes = Buffer.from(configured);
  if (suppliedBytes.length !== configuredBytes.length) {
    return { ok: false, status: 401, reason: 'invalid token' };
  }
  // timingSafeEqual requires equal-length buffers; we pre-checked length.
  if (!timingSafeEqual(suppliedBytes, configuredBytes)) {
    return { ok: false, status: 401, reason: 'invalid token' };
  }
  return { ok: true };
}

function hashPlan(card: ConfirmationCardProps): string {
  const h = createHash('sha256');
  h.update(JSON.stringify(card, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)));
  return `0x${h.digest('hex')}`;
}

function validateMainnetConfig(config: SherpaConfig): void {
  if (!config.isMainnet) return;

  const required = [
    { key: 'aerodromeRouterAddress' as const, name: 'AERODROME_ROUTER_ADDRESS' },
    { key: 'aavePoolAddress' as const, name: 'AAVE_POOL_ADDRESS' },
    { key: 'feeTreasuryAddress' as const, name: 'SHERPA_FEE_TREASURY_ADDRESS' },
    { key: 'tenderlyApiKey' as const, name: 'TENDERLY_API_KEY' },
    { key: 'paymasterUrl' as const, name: 'SHERPA_PAYMASTER_URL' },
  ];

  const missing = required.filter(r => !config[r.key]);

  if (missing.length > 0) {
    const names = missing.map(m => m.name).join(', ');
    throw new Error(`Mainnet startup blocked: missing required env vars: ${names}`);
  }

  console.log(`[sherpa] Starting on BASE MAINNET (chainId 8453)`);
  console.log(`[sherpa] Fee enabled: ${config.feeEnabled}, BPS: ${config.feeBps}`);
  console.log(`[sherpa] Simulation: ${config.simulationFailOpen ? 'fail-open' : 'fail-closed'}`);
}

function serializeCard(card: ConfirmationCardProps): Record<string, unknown> {
  return {
    ...card,
    steps: card.steps.map((s) => ({ ...s, value: s.value.toString() })),
  };
}

export function buildServer(options: BuildServerOptions = {}): FastifyInstance {
  const app = Fastify({ logger: false });

  // Long-lived, per-server instances so Rings 3 (rate limit) and 5 (audit
  // log) share state across requests. Callers may inject their own (Redis /
  // Postgres) implementations in production.
  const config = options.config ?? loadConfig();
  validateMainnetConfig(config);
  // Sentry init is idempotent (singleton) — calling buildServer() twice in
  // the same process (rare, but tests do) is safe. No-op without a DSN.
  initSentry(
    {
      dsn: config.sentryDsn,
      environment: config.sentryEnvironment,
      release: process.env.VERCEL_GIT_COMMIT_SHA,
    },
    options.sentry ?? Sentry,
  );
  const log = options.logger ?? createLogger({ surface: 'api' });
  app.setErrorHandler((err, req, reply) => {
    const routeError = err as { message?: string; status?: number; statusCode?: number };
    const statusCode = routeError.statusCode ?? routeError.status;
    if (statusCode && statusCode < 500) {
      return reply.code(statusCode).send({ error: routeError.message ?? 'bad_request' });
    }
    log.error('uncaught route error', {
      err,
      method: req.method,
      url: req.url,
      requestId: req.id,
    });
    return reply.code(500).send({ error: 'internal_error' });
  });
  const auditStore = options.auditStore ?? createAuditStore(config);
  const rateLimiter = options.rateLimiter ?? createInMemoryRateLimiter();
  const resolver = options.resolver ?? defaultResolver(config);
  const llmComplete = options.llmComplete ?? defaultLlmComplete(config);
  // `userAddress` opt: thread the caller's address through to the router so
  // execute-path parse calls record `llm_usage.user_address` (and pre-auth
  // /api/parse calls record NULL). Wraps llmComplete with a stamper.
  const parse = (input: string, userAddress?: `0x${string}`) =>
    llmComplete
      ? parseWithLLM(input, (req) => llmComplete({ ...req, userAddress }))
      : Promise.resolve(parseDeterministic(input));
  const indexer =
    options.indexer ??
    (config.basescanApiKey
      ? createBasescanIndexer({ apiUrl: config.chain.basescanUrl, apiKey: config.basescanApiKey })
      : emptyIndexer);

  app.get('/api/health', async () => ({ ok: true, ts: Date.now() }));

  app.post('/api/parse', async (req, reply) => {
    const parsed = parseBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid body', details: parsed.error.issues });
    }
    const parsedIntent = await parse(parsed.data.input);
    const userAddress =
      typeof parsed.data.userKey === 'string' && /^0x[a-fA-F0-9]{40}$/.test(parsed.data.userKey)
        ? (parsed.data.userKey as `0x${string}`)
        : undefined;
    const planResult = await plan(parsedIntent, {
      userKey: parsed.data.userKey,
      userAddress,
      chainId: config.chain.chainId,
      paymasterUrl: config.paymasterUrl,
      rateLimiter,
    });
    if (!planResult.ok) {
      return reply.send({ parsed: parsedIntent, error: planResult.error });
    }
    return reply.send({ parsed: parsedIntent, card: serializeCard(planResult.card) });
  });

  app.post('/api/execute', async (req, reply) => {
    const parsed = executeBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid body', details: parsed.error.issues });
    }
    const parsedIntent = await parse(parsed.data.input, parsed.data.userAddress);
    const planResult = await plan(parsedIntent, {
      userKey: parsed.data.userAddress,
      userAddress: parsed.data.userAddress,
      chainId: config.chain.chainId,
      paymasterUrl: config.paymasterUrl,
      rateLimiter,
    });
    if (!planResult.ok) {
      return reply.code(400).send({ ok: false, error: planResult.error });
    }
    const planHash = hashPlan(planResult.card);
    const auditLogId = await createAuditLog(
      {
        userAddress: parsed.data.userAddress,
        intent: parsedIntent.intent,
        planHash,
        submittedAt: Date.now(),
        surface: 'api',
        rawInput: parsed.data.input,
        parsedIntent: parsedIntent as unknown as Record<string, unknown>,
        plan: serializeCard(planResult.card),
      },
      auditStore,
    );
    // Ring 5 write happens here; Ring 7 (user confirmation) occurs client-side
    // and the client POSTs the signed tx hash back to `/api/execute/:id/confirm`
    // in Week 3. For Week 2 we return the plan + audit-log id.
    return reply.send({
      ok: true,
      auditLogId,
      planHash,
      card: serializeCard(planResult.card),
    });
  });

  app.post<{ Params: { id: string } }>('/api/execute/:id/confirm', async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return reply.code(400).send({ error: 'id must be a positive integer' });
    }
    const parsed = confirmBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid body', details: parsed.error.issues });
    }
    try {
      await updateAuditLog(
        id,
        { txHash: parsed.data.txHash, error: parsed.data.error, confirmedAt: Date.now() },
        auditStore,
      );
    } catch (err) {
      return reply.code(404).send({ error: (err as Error).message });
    }
    return reply.send({ ok: true });
  });

  app.get<{ Params: { addr: string } }>('/api/balance/:addr', async (req, reply) => {
    const resolved = await resolver(req.params.addr);
    if (!isResolved(resolved)) return reply.code(400).send({ error: resolved });
    if (!config.useRealRpc) {
      return reply.send({
        address: resolved.address,
        source: resolved.source,
        chain: config.chain.name,
        balances: { ETH: '0', USDC: '0' },
        stage: 'stub',
      });
    }
    try {
      const client = getPublicClient({
        chainId: config.chain.chainId,
        rpcUrl: config.rpcUrl,
      });
      const snap = await fetchBalance(client, resolved.address);
      return reply.send({
        address: resolved.address,
        source: resolved.source,
        chain: config.chain.name,
        balances: { ETH: snap.ethDisplay, USDC: snap.usdcDisplay },
      });
    } catch (err) {
      return reply.code(502).send({ error: 'rpc_error', message: (err as Error).message });
    }
  });

  // ---- Admin: LLM usage reporting -----------------------------------------
  // Both routes are gated by ADMIN_API_KEY (constant-time compared) and
  // require `useRealDb`. In dev / tests without Postgres they 503 — the
  // tables they read don't exist there.
  const adminGuard = (
    req: { headers: Record<string, string | string[] | undefined> } & {
      raw?: unknown;
    },
    reply: { code: (n: number) => { send: (b: unknown) => unknown } },
  ) => {
    const auth = req.headers['authorization'];
    const header = Array.isArray(auth) ? auth[0] : auth;
    const guard = checkAdminAuth(header, config.adminApiKey);
    if (!guard.ok) {
      reply.code(guard.status).send({ error: guard.reason });
      return false;
    }
    if (!config.useRealDb) {
      reply.code(503).send({ error: 'admin endpoints require SHERPA_USE_REAL_DB=true' });
      return false;
    }
    return true;
  };

  app.get('/admin/llm-usage/today', async (req, reply) => {
    if (!adminGuard(req, reply)) return;
    const pool = getPool(config);
    const report = await fetchTodayUsage(pool);
    return reply.send({
      total_usd: report.totalUsd,
      by_task: report.byTask,
      by_provider: report.byProvider,
    });
  });

  app.get<{ Params: { address: string } }>('/admin/llm-usage/user/:address', async (req, reply) => {
    if (!adminGuard(req, reply)) return;
    if (!/^0x[a-fA-F0-9]{40}$/.test(req.params.address)) {
      return reply.code(400).send({ error: 'address must be 0x-prefixed 20-byte hex' });
    }
    const pool = getPool(config);
    const rows = await fetchUserUsage(pool, req.params.address);
    return reply.send({ address: req.params.address, count: rows.length, rows });
  });

  app.get('/admin/paymaster-usage/today', async (req, reply) => {
    if (!adminGuard(req, reply)) return;
    const pool = getPool(config);
    const result = await query(
      pool,
      `SELECT
         COUNT(*) as total_users,
         SUM(count) as total_operations,
         AVG(count)::numeric(10,2) as avg_ops_per_user,
         MAX(count) as max_ops_user
       FROM paymaster_ratelimit
       WHERE window_start > NOW() - INTERVAL '24 hours'`,
    );
    return reply.send({
      period: 'last_24h',
      stats: result.rows[0],
    });
  });

  app.get<{ Params: { address: string } }>('/admin/paymaster-usage/user/:address', async (req, reply) => {
    if (!adminGuard(req, reply)) return;
    if (!/^0x[a-fA-F0-9]{40}$/.test(req.params.address)) {
      return reply.code(400).send({ error: 'address must be 0x-prefixed 20-byte hex' });
    }
    const pool = getPool(config);
    const result = await query(
      pool,
      'SELECT count, window_start FROM paymaster_ratelimit WHERE user_address = $1',
      [req.params.address.toLowerCase()],
    );
    return reply.send({
      address: req.params.address,
      usage: result.rows[0] || { count: 0, window_start: null },
    });
  });

  app.get('/admin/audit-log/today', async (req, reply) => {
    if (!adminGuard(req, reply)) return;
    const pool = getPool(config);
    const result = await query(
      pool,
      `SELECT
         surface,
         status,
         COUNT(*) as count
       FROM audit_log
       WHERE created_at > NOW() - INTERVAL '24 hours'
       GROUP BY surface, status
       ORDER BY surface, status`,
    );
    return reply.send({
      period: 'last_24h',
      breakdown: result.rows,
    });
  });

  app.get<{ Params: { addr: string }; Querystring: { limit?: string } }>(
    '/api/history/:addr',
    async (req, reply) => {
      const resolved = await resolver(req.params.addr);
      if (!isResolved(resolved)) return reply.code(400).send({ error: resolved });
      const rawLimit = Number(req.query.limit ?? 10);
      if (!Number.isFinite(rawLimit)) {
        return reply.code(400).send({ error: 'limit must be a finite number' });
      }
      const limit = Math.min(50, Math.max(1, Math.floor(rawLimit)));
      try {
        const items = await indexer.list(resolved.address, limit);
        return reply.send({ address: resolved.address, chain: config.chain.name, items });
      } catch (err) {
        return reply.code(502).send({ error: 'indexer_error', message: (err as Error).message });
      }
    },
  );

  registerCronRoutes(app, {
    auditStore,
    cronSecret: config.cronSecret,
    tasks: options.cronTasks ?? HOURLY_TASKS,
    log: log.child({ surface: 'cron' }),
  });

  // Defer Postgres pool acquisition when the route is effectively
  // disabled (no paymasterRpcUrl). Tests that flip `useRealDb=true` to
  // exercise admin-route guards must not pay for a paymaster pool they
  // never use — mirrors how createSpendCap/createUsageSink are only
  // constructed when their respective surfaces are wired.
  const paymasterRateLimiter =
    options.paymasterRateLimiter ??
    (config.paymasterRpcUrl
      ? createPaymasterRateLimiter(config)
      : createPaymasterRateLimiter({ ...config, useRealDb: false }));
  registerPaymasterRoutes(app, {
    auditStore,
    rateLimiter: paymasterRateLimiter,
    paymasterRpcUrl: config.paymasterRpcUrl,
    fetch: options.paymasterFetch,
  });

  registerFarcasterRoutes(app);
  registerTelegramRoutes(app);
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  dcaRoutes(app);
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  autoRepayRoutes(app);
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  alertRoutes(app);
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  sessionKeyRoutes(app);
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  strategyRoutes(app);

  return app;
}
