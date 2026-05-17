import Fastify, { type FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
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
  createAlertStore,
  createAutoRepayStore,
  createAuditStore,
  createDCAStore,
  createInMemoryRateLimiter,
  createNotificationStore,
  createPaymasterRateLimiter,
  createSpendCap,
  createUsageSink,
  fetchTodayUsage,
  fetchUserUsage,
  updateAuditLog,
  type AuditLogRow,
  type AuditStore,
  type AlertStore,
  type AutoRepayStore,
  type DCAStore,
  type NotificationStore,
  type PaymasterRateLimiter,
  type RateLimiter,
} from '@sherpa/memory';
import { getPool, query } from '@sherpa/config';
import { timingSafeEqual } from 'node:crypto';
import { HOURLY_TASKS, type HourlyTask } from '@sherpa/scheduler';
import { alertRoutes } from './routes/alerts.js';
import { autoRepayRoutes } from './routes/auto-repay.js';
import { dcaRoutes } from './routes/dca.js';
import { analyticsRoutes } from './routes/analytics.js';
import { securityRoutes } from './routes/security.js';
import { composableRoutes } from './routes/composable.js';
import { developerRoutes } from './routes/developer.js';
import { governanceRoutes } from './routes/governance.js';
import { notificationRoutes } from './routes/notifications.js';
import { portfolioRoutes } from './routes/portfolio.js';
import { sessionKeyRoutes } from './routes/session-keys.js';
import { strategyRoutes } from './routes/strategies.js';
import { registerCronRoutes } from './routes/cron.js';
import { registerFarcasterRoutes } from './routes/farcaster.js';
import { registerPaymasterRoutes } from './routes/paymaster.js';
import { registerTelegramRoutes } from './routes/telegram.js';
import { surfacesRoutes } from './routes/surfaces.js';
import { createRequireStage2 } from './middleware/feature-flag.js';
import {
  createBasescanIndexer,
  createAave,
  emptyIndexer,
  fetchBalance,
  getUserAaveAccountData,
  getPublicClient,
  type SherpaRouterReadContract,
  type AavePosition,
  type HistoryItem,
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

const addressSchema = z.custom<`0x${string}`>(
  (v) => typeof v === 'string' && /^0x[a-fA-F0-9]{40}$/.test(v),
  { message: 'userAddress must be 0x-prefixed 20-byte hex' },
);
const promptInputSchema = z.string().trim().min(1).max(500);
const amountSchema = z.preprocess(
  (v) => (typeof v === 'number' ? String(v) : v),
  z.string().trim().min(1).max(80).regex(/^(?:\d+|\d*\.\d+)$/, 'amount must be a decimal string'),
);
const tokenSymbolSchema = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'asset must be a token symbol')
  .transform((v) => v.toUpperCase());
const optionalSlippageSchema = z
  .preprocess(
    (v) => (typeof v === 'number' ? String(v) : v),
    z.string().trim().min(1).max(16).regex(/^(?:\d+|\d*\.\d+)$/).optional(),
  )
  .optional();

const directStage2Base = z.object({
  input: promptInputSchema.optional(),
  userAddress: addressSchema,
});

const directSwapBody = directStage2Base.extend({
  amount: amountSchema.optional(),
  fromAmount: amountSchema.optional(),
  fromAsset: tokenSymbolSchema.optional(),
  tokenIn: tokenSymbolSchema.optional(),
  toAsset: tokenSymbolSchema.optional(),
  tokenOut: tokenSymbolSchema.optional(),
  slippagePct: optionalSlippageSchema,
});

const directAmountAssetBody = directStage2Base.extend({
  amount: amountSchema.optional(),
  asset: tokenSymbolSchema.optional(),
});

const directBorrowBody = directAmountAssetBody.extend({
  borrowAmount: amountSchema.optional(),
  borrowAsset: tokenSymbolSchema.optional(),
  collateralAsset: tokenSymbolSchema.optional(),
});

const confirmBody = z.object({
  txHash: z
    .custom<`0x${string}`>((v) => typeof v === 'string' && /^0x[a-fA-F0-9]{64}$/.test(v), { message: 'txHash must be 0x-prefixed 32-byte hex' })
    .optional(),
  error: z.string().max(500).optional(),
});

const txHashPattern = /^0x[a-fA-F0-9]{64}$/;
const addressPattern = /^0x[a-fA-F0-9]{40}$/;
const adminRouteOptions = { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } };
const publicReadRouteOptions = { config: { rateLimit: { max: 120, timeWindow: '1 minute' } } };
const stage2ComingSoonIntents = new Set(['SWAP', 'LEND', 'BORROW', 'REPAY', 'WITHDRAW']);
const stage2TestnetExecutableIntents = new Set(['SWAP', 'LEND', 'BORROW']);
type DirectStage2Intent = 'SWAP' | 'LEND' | 'BORROW' | 'REPAY' | 'WITHDRAW';

type PositionsResponse = {
  address: `0x${string}`;
  chain: 'base';
  pool: `0x${string}`;
  totalCollateralBase: string;
  totalDebtBase: string;
  availableBorrowsBase: string;
  currentLiquidationThreshold: string;
  ltv: string;
  healthFactor: string;
  hasPosition: boolean;
  fetchedAt: string;
};

type PositionReader = (address: `0x${string}`) => Promise<AavePosition>;

function stringField(source: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = source?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function firstAuditTxHash(row: AuditLogRow): `0x${string}` | undefined {
  const txHash = row.patch.txHash ?? row.patch.txHashes?.[0];
  return typeof txHash === 'string' && txHashPattern.test(txHash)
    ? (txHash as `0x${string}`)
    : undefined;
}

function auditRowToHistoryItem(row: AuditLogRow): HistoryItem | undefined {
  if (row.patch.error) return undefined;
  const txHash = firstAuditTxHash(row);
  if (!txHash) return undefined;

  const plan = row.plan;
  const amountDisplay =
    stringField(plan, 'primary_amount_display') ??
    stringField(plan, 'primary_action_label') ??
    row.intent;
  const amountParts = amountDisplay.trim().split(/\s+/);
  const counterparty =
    stringField(plan, 'recipient_display') ??
    stringField(plan, 'secondary_amount_display') ??
    row.userAddress;

  return {
    txHash,
    timestamp: row.patch.confirmedAt ?? row.submittedAt,
    direction: 'out',
    counterparty,
    asset: amountParts.at(-1) ?? row.intent,
    amountDisplay,
    sherpaIntent: row.intent,
  };
}

async function listAuditHistory(
  auditStore: AuditStore,
  address: `0x${string}`,
): Promise<HistoryItem[]> {
  const rows = await auditStore.list(address);
  return rows.map(auditRowToHistoryItem).filter((item): item is HistoryItem => Boolean(item));
}

function mergeHistoryItems(
  indexedItems: HistoryItem[],
  auditItems: HistoryItem[],
  limit: number,
): HistoryItem[] {
  const byHash = new Map<string, HistoryItem>();
  for (const item of indexedItems) byHash.set(item.txHash.toLowerCase(), item);
  for (const item of auditItems) {
    const key = item.txHash.toLowerCase();
    const existing = byHash.get(key);
    byHash.set(key, existing ? { ...existing, sherpaIntent: item.sherpaIntent } : item);
  }
  return [...byHash.values()]
    .sort((a, b) => b.timestamp - a.timestamp || b.txHash.localeCompare(a.txHash))
    .slice(0, limit);
}

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
  /** Override notification persistence (tests can inject an isolated store). */
  notificationStore?: NotificationStore;
  /** Override alert persistence (tests can inject an isolated store). */
  alertStore?: AlertStore;
  /** Override DCA persistence (tests can inject an isolated store). */
  dcaStore?: DCAStore;
  /** Override auto-repay persistence (tests can inject an isolated store). */
  autoRepayStore?: AutoRepayStore;
  /** Override fetch for the paymaster proxy (tests assert request shape). */
  paymasterFetch?: typeof globalThis.fetch;
  /** Override Base Aave positions reader (tests inject a deterministic mock). */
  positionsReader?: PositionReader;
  /** Override Stage 2 Router read calls (tests inject deterministic quote/reserve responses). */
  stage2ReadContract?: SherpaRouterReadContract;
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

  const missing = required.filter((r) => !config[r.key]);

  if (missing.length > 0) {
    const names = missing.map((m) => m.name).join(', ');
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

function serializePosition(address: `0x${string}`, position: AavePosition): PositionsResponse {
  return {
    address,
    chain: 'base',
    pool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
    totalCollateralBase: position.totalCollateralBase.toString(),
    totalDebtBase: position.totalDebtBase.toString(),
    availableBorrowsBase: position.availableBorrowsBase.toString(),
    currentLiquidationThreshold: position.currentLiquidationThreshold.toString(),
    ltv: position.ltv.toString(),
    healthFactor: position.healthFactor.toString(),
    hasPosition: position.hasPosition,
    fetchedAt: position.fetchedAt.toISOString(),
  };
}

function isStage2ComingSoonIntent(intent: string): boolean {
  return stage2ComingSoonIntents.has(intent);
}

function missingFields(fields: Record<string, unknown>): string[] {
  return Object.entries(fields)
    .filter(([, value]) => value === undefined || value === '')
    .map(([key]) => key);
}

function directInputError(missing: string[]): { error: string; missing: string[] } {
  return {
    error: 'invalid body',
    missing,
  };
}

function buildDirectSwapInput(data: z.infer<typeof directSwapBody>): string | { error: string; missing: string[] } {
  if (data.input) return data.input;
  const amount = data.fromAmount ?? data.amount;
  const fromAsset = data.fromAsset ?? data.tokenIn;
  const toAsset = data.toAsset ?? data.tokenOut;
  const missing = missingFields({ fromAmount: amount, fromAsset, toAsset });
  if (missing.length > 0) return directInputError(missing);
  const slippage = data.slippagePct ? ` with ${data.slippagePct}% slippage` : '';
  return `swap ${amount} ${fromAsset} for ${toAsset}${slippage}`;
}

function buildAmountAssetInput(
  data: z.infer<typeof directAmountAssetBody>,
  verb: 'lend' | 'repay' | 'withdraw',
): string | { error: string; missing: string[] } {
  if (data.input) return data.input;
  const missing = missingFields({ amount: data.amount, asset: data.asset });
  if (missing.length > 0) return directInputError(missing);
  const suffix = verb === 'lend' ? ' to aave' : verb === 'withdraw' ? ' from aave' : '';
  return `${verb} ${data.amount} ${data.asset}${suffix}`;
}

function buildBorrowInput(data: z.infer<typeof directBorrowBody>): string | { error: string; missing: string[] } {
  if (data.input) return data.input;
  const amount = data.borrowAmount ?? data.amount;
  const asset = data.borrowAsset ?? data.asset;
  const missing = missingFields({ amount, asset });
  if (missing.length > 0) return directInputError(missing);
  return data.collateralAsset
    ? `borrow ${amount} ${asset} against ${data.collateralAsset}`
    : `borrow ${amount} ${asset}`;
}

function stage2FeatureName(intent: DirectStage2Intent): string {
  return intent.toLowerCase();
}

function canRunStage2Testnet(config: SherpaConfig): boolean {
  return config.chainEnv === 'base-sepolia' && config.chainId === 84532 && config.stage2TestnetEnabled;
}

function canRunStage2Mainnet(config: SherpaConfig, userAddress: `0x${string}` | undefined): boolean {
  if (!config.stage2Enabled || !userAddress) return false;
  const allowed =
    config.stage2PublicMainnetEnabled ||
    config.stage2BetaWallets.some((addr) => addr.toLowerCase() === userAddress.toLowerCase());
  return Boolean(
    allowed &&
      config.sherpaRouterBaseMainnet &&
      config.aerodromeRouterAddress &&
      config.aerodromeFactoryAddress &&
      config.aavePoolAddress,
  );
}

function canRunStage2Intent(config: SherpaConfig, intent: string, userAddress: `0x${string}` | undefined): boolean {
  if (stage2TestnetExecutableIntents.has(intent) && canRunStage2Testnet(config)) return true;
  return stage2ComingSoonIntents.has(intent) && canRunStage2Mainnet(config, userAddress);
}

function stage2PlanDeps(
  config: SherpaConfig,
  userAddress: `0x${string}` | undefined,
  readContract?: SherpaRouterReadContract,
) {
  if (canRunStage2Mainnet(config, userAddress)) {
    return {
      aave: config.aavePoolAddress ? createAave({ chainId: 8453, poolAddress: config.aavePoolAddress }) : undefined,
      aerodromeFactoryAddress: config.aerodromeFactoryAddress,
      aerodromeRouterAddress: config.aerodromeRouterAddress,
      chainId: 8453,
      paymasterUrl: undefined,
      sherpaRouterAddress: config.sherpaRouterBaseMainnet,
      stage2Mainnet: true,
      stage2ReadContract: readContract,
      stage2RpcUrl: config.baseMainnetRpcUrl,
    };
  }
  if (!canRunStage2Testnet(config)) return {};
  return {
    aerodromeRouterAddress: config.aerodromeRouterAddress,
    aave: config.aavePoolAddress
      ? createAave({ chainId: 84532, poolAddress: config.aavePoolAddress })
      : undefined,
    stage2Testnet: true,
  };
}

export function buildServer(options: BuildServerOptions = {}): FastifyInstance {
  const app = Fastify({ logger: false });
  void app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
    allowList: (req) => req.url === '/api/health',
    errorResponseBuilder: () => ({ error: 'rate_limit' }),
  });

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
  const sharedAutomationConfig =
    config.databaseUrl ? config : { ...config, useRealDb: false };
  const alertStore = options.alertStore ?? createAlertStore(sharedAutomationConfig);
  const dcaStore = options.dcaStore ?? createDCAStore(sharedAutomationConfig);
  const autoRepayStore =
    options.autoRepayStore ?? createAutoRepayStore(sharedAutomationConfig);
  const automationPersistence = sharedAutomationConfig.useRealDb ? 'postgres' : 'process-memory';
  const rateLimiter = options.rateLimiter ?? createInMemoryRateLimiter();
  const resolver = options.resolver ?? defaultResolver(config);
  const llmComplete = options.llmComplete ?? defaultLlmComplete(config);
  const positionsReader =
    options.positionsReader ??
    ((address: `0x${string}`) =>
      getUserAaveAccountData(address, process.env.BASE_MAINNET_RPC_URL || process.env.BASE_RPC_URL));
  const positionsCache = new Map<string, { data: PositionsResponse; expires: number }>();
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
    if (isStage2ComingSoonIntent(parsedIntent.intent) && !canRunStage2Intent(config, parsedIntent.intent, userAddress)) {
      return reply.send({
        parsed: parsedIntent,
        stage2: { status: 'coming_soon', reason: 'stage2_not_enabled' },
      });
    }
    const planResult = await plan(parsedIntent, {
      userKey: parsed.data.userKey,
      userAddress,
      chainId: config.chain.chainId,
      paymasterUrl: config.paymasterUrl,
      rateLimiter,
      resolver,
      ...stage2PlanDeps(config, userAddress, options.stage2ReadContract),
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
    if (parsedIntent.intent === 'POSITIONS') {
      return reply.code(400).send({
        ok: false,
        error: 'positions is read-only; use GET /api/positions/:address',
      });
    }
    if (isStage2ComingSoonIntent(parsedIntent.intent) && !canRunStage2Intent(config, parsedIntent.intent, parsed.data.userAddress)) {
      return reply.code(400).send({
        ok: false,
        error: `Stage 2 ${parsedIntent.intent.toLowerCase()} is not enabled for this wallet or environment.`,
      });
    }
    const planResult = await plan(parsedIntent, {
      userKey: parsed.data.userAddress,
      userAddress: parsed.data.userAddress,
      chainId: config.chain.chainId,
      paymasterUrl: config.paymasterUrl,
      rateLimiter,
      resolver,
      ...stage2PlanDeps(config, parsed.data.userAddress, options.stage2ReadContract),
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
      const status = parsed.data.error ? 'failed' : parsed.data.txHash ? 'success' : undefined;
      await updateAuditLog(
        id,
        {
          txHash: parsed.data.txHash,
          error: parsed.data.error,
          confirmedAt: Date.now(),
          status,
        },
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
    const balanceChain = config.stage2PublicMainnetEnabled
      ? { chainId: 8453, rpcUrl: config.baseMainnetRpcUrl, name: 'base' }
      : { chainId: config.chain.chainId, rpcUrl: config.rpcUrl, name: config.chain.name };
    if (!config.useRealRpc) {
      return reply.send({
        address: resolved.address,
        source: resolved.source,
        chain: balanceChain.name,
        balances: { ETH: '0', USDC: '0' },
        stage: 'stub',
      });
    }
    try {
      const client = getPublicClient({
        chainId: balanceChain.chainId,
        rpcUrl: balanceChain.rpcUrl,
      });
      const snap = await fetchBalance(client, resolved.address, { chainId: balanceChain.chainId });
      return reply.send({
        address: resolved.address,
        source: resolved.source,
        chain: balanceChain.name,
        balances: { ETH: snap.ethDisplay, USDC: snap.usdcDisplay },
      });
    } catch (err) {
      return reply.code(502).send({ error: 'rpc_error', message: (err as Error).message });
    }
  });

  app.get<{ Params: { address: string } }>(
    '/api/positions/:address',
    publicReadRouteOptions,
    async (req, reply) => {
      if (!addressPattern.test(req.params.address)) {
        return reply.code(400).send({ error: 'invalid_address' });
      }
      const address = req.params.address.toLowerCase() as `0x${string}`;
      const cached = positionsCache.get(address);
      if (cached && cached.expires > Date.now()) return reply.send(cached.data);

      try {
        const position = await positionsReader(address);
        const data = serializePosition(address, position);
        positionsCache.set(address, { data, expires: Date.now() + 60_000 });
        return reply.send(data);
      } catch (err) {
        log.warn('positions fetch failed', {
          err,
          address,
          route: '/api/positions/:address',
        });
        return reply.code(500).send({
          error: 'aave_query_failed',
          details: (err as Error).message || 'unknown error',
        });
      }
    },
  );

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

  app.get('/admin/llm-usage/today', adminRouteOptions, async (req, reply) => {
    if (!adminGuard(req, reply)) return;
    const pool = getPool(config);
    const report = await fetchTodayUsage(pool);
    return reply.send({
      total_usd: report.totalUsd,
      by_task: report.byTask,
      by_provider: report.byProvider,
    });
  });

  app.get<{ Params: { address: string } }>(
    '/admin/llm-usage/user/:address',
    adminRouteOptions,
    async (req, reply) => {
      if (!adminGuard(req, reply)) return;
      if (!/^0x[a-fA-F0-9]{40}$/.test(req.params.address)) {
        return reply.code(400).send({ error: 'address must be 0x-prefixed 20-byte hex' });
      }
      const pool = getPool(config);
      const rows = await fetchUserUsage(pool, req.params.address);
      return reply.send({ address: req.params.address, count: rows.length, rows });
    },
  );

  app.get('/admin/paymaster-usage/today', adminRouteOptions, async (req, reply) => {
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

  app.get<{ Params: { address: string } }>(
    '/admin/paymaster-usage/user/:address',
    adminRouteOptions,
    async (req, reply) => {
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
    },
  );

  app.get('/admin/audit-log/today', adminRouteOptions, async (req, reply) => {
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
    publicReadRouteOptions,
    async (req, reply) => {
      const resolved = await resolver(req.params.addr);
      if (!isResolved(resolved)) return reply.code(400).send({ error: resolved });
      const rawLimit = Number(req.query.limit ?? 10);
      if (!Number.isFinite(rawLimit)) {
        return reply.code(400).send({ error: 'limit must be a finite number' });
      }
      const limit = Math.min(50, Math.max(1, Math.floor(rawLimit)));
      try {
        const [indexedItems, auditItems] = await Promise.all([
          indexer.list(resolved.address, limit),
          listAuditHistory(auditStore, resolved.address),
        ]);
        const items = mergeHistoryItems(indexedItems, auditItems, limit);
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

  registerFarcasterRoutes(app, config);
  registerTelegramRoutes(app);
  dcaRoutes(app, dcaStore, automationPersistence);
  autoRepayRoutes(app, autoRepayStore, automationPersistence);
  alertRoutes(app, alertStore, automationPersistence);
  sessionKeyRoutes(app);
  strategyRoutes(app);
  notificationRoutes(app, {
    store:
      options.notificationStore ??
      createNotificationStore(sharedAutomationConfig),
  });
  portfolioRoutes(app);
  governanceRoutes(app);
  analyticsRoutes(app);
  securityRoutes(app);
  developerRoutes(app);
  composableRoutes(app);
  surfacesRoutes(app, config);

  // ---- Stage 2 routes (gated by SHERPA_STAGE_2_ENABLED) --------------------
  const requireStage2 = createRequireStage2(config);

  const buildDirectStage2Card = async (
    input: string,
    expectedIntent: DirectStage2Intent,
    userAddress: `0x${string}`,
  ) => {
    const parsedIntent = await parse(input, userAddress);
    if (parsedIntent.intent !== expectedIntent) {
      return {
        status: 400,
        body: {
          ok: false,
          error: 'intent_mismatch',
          expected: expectedIntent,
          parsed: parsedIntent,
        },
      };
    }
    if (!canRunStage2Intent(config, parsedIntent.intent, userAddress)) {
      return {
        status: 400,
        body: {
          ok: false,
          error: `Stage 2 ${stage2FeatureName(expectedIntent)} is not enabled for this wallet or environment.`,
          parsed: parsedIntent,
        },
      };
    }
    const planResult = await plan(parsedIntent, {
      userKey: userAddress,
      userAddress,
      chainId: config.chain.chainId,
      paymasterUrl: config.paymasterUrl,
      rateLimiter,
      resolver,
      ...stage2PlanDeps(config, userAddress, options.stage2ReadContract),
    });
    if (!planResult.ok) {
      return {
        status: 400,
        body: { ok: false, error: planResult.error, parsed: parsedIntent },
      };
    }
    return {
      status: 200,
      body: {
        ok: true,
        parsed: parsedIntent,
        planHash: hashPlan(planResult.card),
        card: serializeCard(planResult.card),
      },
    };
  };

  app.post('/api/swap', { preHandler: requireStage2 }, async (req, reply) => {
    const parsed = directSwapBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid body', details: parsed.error.issues });
    const input = buildDirectSwapInput(parsed.data);
    if (typeof input !== 'string') return reply.code(400).send(input);
    const result = await buildDirectStage2Card(input, 'SWAP', parsed.data.userAddress);
    return reply.code(result.status).send(result.body);
  });

  app.get('/api/swap/quote', { preHandler: requireStage2 }, async (req, reply) => {
    const parsed = directSwapBody.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid query', details: parsed.error.issues });
    const input = buildDirectSwapInput(parsed.data);
    if (typeof input !== 'string') return reply.code(400).send(input);
    const result = await buildDirectStage2Card(input, 'SWAP', parsed.data.userAddress);
    return reply.code(result.status).send(result.body);
  });

  app.post('/api/lend', { preHandler: requireStage2 }, async (req, reply) => {
    const parsed = directAmountAssetBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid body', details: parsed.error.issues });
    const input = buildAmountAssetInput(parsed.data, 'lend');
    if (typeof input !== 'string') return reply.code(400).send(input);
    const result = await buildDirectStage2Card(input, 'LEND', parsed.data.userAddress);
    return reply.code(result.status).send(result.body);
  });

  app.get('/api/lend/apy', { preHandler: requireStage2 }, async (req, reply) => {
    const parsed = directAmountAssetBody.safeParse({ amount: '1', ...((req.query ?? {}) as Record<string, unknown>) });
    if (!parsed.success) return reply.code(400).send({ error: 'invalid query', details: parsed.error.issues });
    const input = buildAmountAssetInput(parsed.data, 'lend');
    if (typeof input !== 'string') return reply.code(400).send(input);
    const result = await buildDirectStage2Card(input, 'LEND', parsed.data.userAddress);
    if (result.status !== 200) return reply.code(result.status).send(result.body);
    return reply.code(result.status).send({
      ...result.body,
      apy: {
        asset: parsed.data.asset,
        supplyApyBps: null,
        source: 'aave_preview_card',
        note: 'Direct live APY polling is not exposed yet; this endpoint returns the same Aave planning preview as /api/lend.',
      },
    });
  });

  app.post('/api/withdraw', { preHandler: requireStage2 }, async (req, reply) => {
    const parsed = directAmountAssetBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid body', details: parsed.error.issues });
    const input = buildAmountAssetInput(parsed.data, 'withdraw');
    if (typeof input !== 'string') return reply.code(400).send(input);
    const result = await buildDirectStage2Card(input, 'WITHDRAW', parsed.data.userAddress);
    return reply.code(result.status).send(result.body);
  });

  app.post('/api/borrow', { preHandler: requireStage2 }, async (req, reply) => {
    const parsed = directBorrowBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid body', details: parsed.error.issues });
    const input = buildBorrowInput(parsed.data);
    if (typeof input !== 'string') return reply.code(400).send(input);
    const result = await buildDirectStage2Card(input, 'BORROW', parsed.data.userAddress);
    return reply.code(result.status).send(result.body);
  });

  app.get('/api/borrow/preview', { preHandler: requireStage2 }, async (req, reply) => {
    const parsed = directBorrowBody.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid query', details: parsed.error.issues });
    const input = buildBorrowInput(parsed.data);
    if (typeof input !== 'string') return reply.code(400).send(input);
    const result = await buildDirectStage2Card(input, 'BORROW', parsed.data.userAddress);
    return reply.code(result.status).send(result.body);
  });

  app.post('/api/repay', { preHandler: requireStage2 }, async (req, reply) => {
    const parsed = directAmountAssetBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid body', details: parsed.error.issues });
    const input = buildAmountAssetInput(parsed.data, 'repay');
    if (typeof input !== 'string') return reply.code(400).send(input);
    const result = await buildDirectStage2Card(input, 'REPAY', parsed.data.userAddress);
    return reply.code(result.status).send(result.body);
  });

  return app;
}
