import { describe, it, expect, vi } from 'vitest';
import { loadConfig } from '@sherpa/config';
import { createInMemoryAuditStore, createInMemoryRateLimiter } from '@sherpa/memory';
import { _resetSentryForTests, type Logger, type SentryLike } from '@sherpa/logger';
import { buildServer } from './server.js';
import type { LLMResponse } from '@sherpa/llm';

const offlineConfig = { ...loadConfig(), stage2TestnetEnabled: false, useRealRpc: false } as const;
const testnetStage2Config = { ...offlineConfig, stage2TestnetEnabled: true } as const;

const USDC_RECIPIENT = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const MAINNET_ROUTER = '0x00bfef87DD352D48F8572BcfA52E57870B35DE8b' as const;
const MAINNET_AERODROME = '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43' as const;
const MAINNET_FACTORY = '0x420DD381b31aEf6683db6B902084cB0FFECe40Da' as const;
const MAINNET_AAVE = '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5' as const;
const MAINNET_ATOKEN = '0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB' as const;
const MAINNET_DEBT_TOKEN = '0x59dca05b6c26dbd64b5381374aAaC5CD05644C28' as const;
const fakeLlmUsage: LLMResponse['usage'] = {
  provider: 'gpt-4o-mini',
  model: 'gpt-4o-mini',
  promptTokens: 1,
  completionTokens: 1,
  costUsd: 0,
  latencyMs: 0,
};
const mainnetStage2Config = {
  ...offlineConfig,
  aerodromeFactoryAddress: MAINNET_FACTORY,
  aerodromeRouterAddress: MAINNET_AERODROME,
  aavePoolAddress: MAINNET_AAVE,
  baseMainnetRpcUrl: 'https://mainnet.base.org',
  sherpaRouterBaseMainnet: MAINNET_ROUTER,
  stage2BetaWallets: [USDC_RECIPIENT],
  stage2Enabled: true,
  stage2PublicMainnetEnabled: false,
} as const;

function mainnetStage2ReadContract(params: { functionName: string }) {
  if (params.functionName === 'getAmountsOut') return Promise.resolve([1_000_000n, 999_000n]);
  if (params.functionName === 'getReserveData') {
    const reserveData = Array.from({ length: 12 }, () => 0n) as unknown[];
    reserveData[8] = MAINNET_ATOKEN;
    reserveData[10] = MAINNET_DEBT_TOKEN;
    return Promise.resolve(reserveData);
  }
  throw new Error(`unexpected readContract call: ${params.functionName}`);
}

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
      payload: { input: `send 5 usdc to ${USDC_RECIPIENT}`, userKey: USDC_RECIPIENT },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { card?: { intent: string; batch?: { chainId: string }; steps: unknown[] } };
    expect(body.card?.intent).toBe('SEND');
    expect(body.card?.batch?.chainId).toBe('0x2105');
    expect(body.card?.steps.length).toBe(1);
    await app.close();
  });

  it('POST /api/parse resolves IDENTITY_LOOKUP through the configured resolver', async () => {
    const routeErrors: unknown[] = [];
    const logger: Logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn((_msg, ctx) => routeErrors.push((ctx as { err?: unknown }).err)),
      child: vi.fn(() => logger),
    };
    const app = buildServer({
      config: offlineConfig,
      logger,
      resolver: async () => ({
        address: USDC_RECIPIENT,
        source: 'basename',
        display: 'jesse.base.eth',
        metadata: { basename: 'jesse.base.eth' },
      }),
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/parse',
      payload: { input: 'who is jesse.base.eth', userKey: USDC_RECIPIENT },
    });
    if (res.statusCode !== 200) throw routeErrors[0];
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      parsed?: { intent: string };
      card?: { intent: string; recipient_display?: string; recipient_metadata?: Record<string, unknown> };
    };
    expect(body.parsed?.intent).toBe('IDENTITY_LOOKUP');
    expect(body.card?.intent).toBe('IDENTITY_LOOKUP');
    expect(body.card?.recipient_display).toBe(USDC_RECIPIENT);
    expect(body.card?.recipient_metadata).toMatchObject({
      source: 'basename',
      query: 'jesse.base.eth',
    });
    await app.close();
  });

  it('POST /api/parse recognizes POSITIONS as a read-only card', async () => {
    const app = buildServer({ config: offlineConfig });
    const res = await app.inject({
      method: 'POST',
      url: '/api/parse',
      payload: { input: 'show my positions', userKey: USDC_RECIPIENT },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { parsed?: { intent: string }; card?: { intent: string; steps: unknown[] } };
    expect(body.parsed?.intent).toBe('POSITIONS');
    expect(body.card?.intent).toBe('POSITIONS');
    expect(body.card?.steps).toEqual([]);
    await app.close();
  });

  it('POST /api/parse uses LLM fallback for typoed balance requests', async () => {
    const app = buildServer({
      config: offlineConfig,
      llmComplete: async (): Promise<LLMResponse> => ({
        text: '{"intent":"BALANCE","slots":{},"confidence":0.82}',
        usage: fakeLlmUsage,
      }),
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/parse',
      payload: { input: 'what is my balnce', userKey: USDC_RECIPIENT },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { parsed?: { intent: string }; card?: { intent: string; steps: unknown[] } };
    expect(body.parsed?.intent).toBe('BALANCE');
    expect(body.card?.intent).toBe('BALANCE');
    expect(body.card?.steps).toEqual([]);
    await app.close();
  });

  it('POST /api/parse rejects LLM output that rewrites the user amount', async () => {
    const app = buildServer({
      config: offlineConfig,
      llmComplete: async (): Promise<LLMResponse> => ({
        text: '{"intent":"SEND","slots":{"amount":"1","rawAmountText":"1","asset":"USDC","to":"vitalik.eth"},"confidence":0.91}',
        usage: fakeLlmUsage,
      }),
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/parse',
      payload: { input: 'sned 0.1 usdc to vitalik dot eth', userKey: USDC_RECIPIENT },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { parsed?: { intent: string; confidence: number }; card?: unknown; error?: string };
    expect(body.parsed?.intent).toBe('UNKNOWN');
    expect(body.parsed?.confidence).toBe(0);
    expect(body.card).toBeUndefined();
    expect(body.error).toMatch(/intent UNKNOWN not supported/i);
    await app.close();
  });

  it('POST /api/parse recognizes Stage 2 write intents without returning executable cards', async () => {
    const app = buildServer({ config: offlineConfig });
    const res = await app.inject({
      method: 'POST',
      url: '/api/parse',
      payload: { input: 'swap 1 usdc for eth', userKey: USDC_RECIPIENT },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      parsed?: { intent: string };
      card?: unknown;
      stage2?: { status: string; reason: string };
    };
    expect(body.parsed?.intent).toBe('SWAP');
    expect(body.card).toBeUndefined();
    expect(body.stage2).toEqual({ status: 'coming_soon', reason: 'stage2_not_enabled' });
    await app.close();
  });

  it('POST /api/parse returns executable cards for testnet-enabled Stage 2 intents', async () => {
    const app = buildServer({ config: testnetStage2Config });
    const res = await app.inject({
      method: 'POST',
      url: '/api/parse',
      payload: { input: 'lend 1 usdc to aave', userKey: USDC_RECIPIENT },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      parsed?: { intent: string };
      card?: { intent: string; batch?: { chainId: string; calls: unknown[] }; warnings?: string[] };
      stage2?: unknown;
    };
    expect(body.parsed?.intent).toBe('LEND');
    expect(body.stage2).toBeUndefined();
    expect(body.card?.intent).toBe('LEND');
    expect(body.card?.batch?.chainId).toBe('0x14a34');
    expect(body.card?.batch?.calls.length).toBe(2);
    expect(body.card?.warnings?.join(' ')).toMatch(/Base Sepolia testnet only/i);
    await app.close();
  });

  it('POST /api/parse returns mainnet Stage 2 cards for allowlisted wallets', async () => {
    const app = buildServer({
      config: mainnetStage2Config,
      stage2ReadContract: async () => [999_000n, 2_000_000_000_000_000n],
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/parse',
      payload: { input: 'swap 1 usdc for eth', userKey: USDC_RECIPIENT },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      parsed?: { intent: string };
      card?: { intent: string; batch?: { chainId: string; calls: Array<{ to: string }> }; gas_display?: string };
      stage2?: unknown;
    };
    expect(body.parsed?.intent).toBe('SWAP');
    expect(body.stage2).toBeUndefined();
    expect(body.card?.intent).toBe('SWAP');
    expect(body.card?.batch?.chainId).toBe('0x2105');
    expect(body.card?.batch?.calls.at(-1)?.to).toBe(MAINNET_ROUTER);
    expect(body.card?.gas_display).toBe('user pays');
    await app.close();
  });

  it('POST /api/parse keeps mainnet Stage 2 gated for non-allowlisted wallets', async () => {
    const app = buildServer({ config: { ...mainnetStage2Config, stage2BetaWallets: [] } });
    const res = await app.inject({
      method: 'POST',
      url: '/api/parse',
      payload: { input: 'lend 1 usdc to aave', userKey: USDC_RECIPIENT },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      parsed: { intent: 'LEND' },
      stage2: { status: 'coming_soon' },
    });
    await app.close();
  });

  it('POST /api/parse returns public mainnet Stage 2 cards when public mainnet is enabled', async () => {
    const app = buildServer({
      config: {
        ...mainnetStage2Config,
        stage2BetaWallets: [],
        stage2PublicMainnetEnabled: true,
      },
      stage2ReadContract: async () => [999_000n, 2_000_000_000_000_000n],
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/parse',
      payload: { input: 'swap 1 usdc for eth', userKey: USDC_RECIPIENT },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      card?: { intent: string; batch?: { chainId: string; calls: Array<{ to: string }> } };
      stage2?: unknown;
    };
    expect(body.stage2).toBeUndefined();
    expect(body.card?.intent).toBe('SWAP');
    expect(body.card?.batch?.chainId).toBe('0x2105');
    expect(body.card?.batch?.calls.at(-1)?.to).toBe(MAINNET_ROUTER);
    await app.close();
  });

  it('POST /api/swap builds a direct Stage 2 mainnet card instead of a stub', async () => {
    const app = buildServer({
      config: mainnetStage2Config,
      stage2ReadContract: mainnetStage2ReadContract,
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/swap',
      payload: {
        userAddress: USDC_RECIPIENT,
        fromAmount: '1',
        fromAsset: 'USDC',
        toAsset: 'WETH',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      ok: boolean;
      parsed?: { intent: string };
      planHash?: string;
      card?: { intent: string; batch?: { chainId: string; calls: Array<{ to: string }> }; gas_display?: string };
    };
    expect(body.ok).toBe(true);
    expect(body.parsed?.intent).toBe('SWAP');
    expect(body.planHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(body.card?.intent).toBe('SWAP');
    expect(body.card?.batch?.chainId).toBe('0x2105');
    expect(body.card?.batch?.calls.at(-1)?.to).toBe(MAINNET_ROUTER);
    expect(body.card?.gas_display).toBe('user pays');
    await app.close();
  });

  it('GET /api/swap/quote builds the same direct Stage 2 swap preview path', async () => {
    const app = buildServer({
      config: mainnetStage2Config,
      stage2ReadContract: mainnetStage2ReadContract,
    });
    const res = await app.inject({
      method: 'GET',
      url: `/api/swap/quote?userAddress=${USDC_RECIPIENT}&fromAmount=1&fromAsset=USDC&toAsset=WETH`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { ok: boolean; card?: { intent: string; batch?: { chainId: string } } };
    expect(body.ok).toBe(true);
    expect(body.card?.intent).toBe('SWAP');
    expect(body.card?.batch?.chainId).toBe('0x2105');
    await app.close();
  });

  it('direct Stage 2 Aave routes build mainnet cards instead of stubs', async () => {
    const app = buildServer({
      config: mainnetStage2Config,
      stage2ReadContract: mainnetStage2ReadContract,
    });
    const routes = [
      { method: 'POST' as const, url: '/api/lend', payload: { userAddress: USDC_RECIPIENT, amount: '1', asset: 'USDC' }, intent: 'LEND' },
      { method: 'POST' as const, url: '/api/borrow', payload: { userAddress: USDC_RECIPIENT, amount: '1', asset: 'USDC' }, intent: 'BORROW' },
      { method: 'POST' as const, url: '/api/repay', payload: { userAddress: USDC_RECIPIENT, amount: '1', asset: 'USDC' }, intent: 'REPAY' },
      { method: 'POST' as const, url: '/api/withdraw', payload: { userAddress: USDC_RECIPIENT, amount: '1', asset: 'USDC' }, intent: 'WITHDRAW' },
    ];

    for (const route of routes) {
      const res = await app.inject({
        method: route.method,
        url: route.url,
        payload: route.payload,
      });
      expect(res.statusCode, route.url).toBe(200);
      const body = res.json() as {
        ok: boolean;
        card?: { intent: string; batch?: { chainId: string; calls: Array<{ to: string }> } };
      };
      expect(body.ok, route.url).toBe(true);
      expect(body.card?.intent, route.url).toBe(route.intent);
      expect(body.card?.batch?.chainId, route.url).toBe('0x2105');
      expect(body.card?.batch?.calls.at(-1)?.to, route.url).toBe(MAINNET_ROUTER);
    }
    await app.close();
  });

  it('direct Stage 2 GET Aave helper routes return previews instead of stubs', async () => {
    const app = buildServer({
      config: mainnetStage2Config,
      stage2ReadContract: mainnetStage2ReadContract,
    });
    const lend = await app.inject({
      method: 'GET',
      url: `/api/lend/apy?userAddress=${USDC_RECIPIENT}&asset=USDC&amount=1`,
    });
    expect(lend.statusCode).toBe(200);
    expect(lend.json()).toMatchObject({
      ok: true,
      card: { intent: 'LEND' },
      apy: { asset: 'USDC', source: 'aave_preview_card' },
    });

    const borrow = await app.inject({
      method: 'GET',
      url: `/api/borrow/preview?userAddress=${USDC_RECIPIENT}&asset=USDC&amount=1`,
    });
    expect(borrow.statusCode).toBe(200);
    expect(borrow.json()).toMatchObject({
      ok: true,
      card: { intent: 'BORROW' },
    });
    await app.close();
  });

  it('direct Stage 2 routes keep wallet and environment gates', async () => {
    const app = buildServer({ config: { ...mainnetStage2Config, stage2BetaWallets: [] } });
    const res = await app.inject({
      method: 'POST',
      url: '/api/lend',
      payload: { userAddress: USDC_RECIPIENT, amount: '1', asset: 'USDC' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      ok: false,
      error: expect.stringContaining('not enabled for this wallet or environment'),
    });
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

  it('POST /api/execute blocks Stage 2 write intents when disabled for the wallet', async () => {
    const app = buildServer({ config: offlineConfig });
    const res = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: { input: 'swap 1 usdc for eth', userAddress: USDC_RECIPIENT },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      ok: false,
      error: expect.stringContaining('not enabled for this wallet or environment'),
    });
    await app.close();
  });

  it('POST /api/execute allows testnet-enabled Stage 2 intents', async () => {
    const auditStore = createInMemoryAuditStore();
    const app = buildServer({ auditStore, config: testnetStage2Config });
    const res = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: { input: 'borrow 1 usdc', userAddress: USDC_RECIPIENT },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      ok: boolean;
      card?: { intent: string; batch?: { chainId: string; calls: unknown[] } };
    };
    expect(body.ok).toBe(true);
    expect(body.card?.intent).toBe('BORROW');
    expect(body.card?.batch?.chainId).toBe('0x14a34');
    expect(body.card?.batch?.calls.length).toBe(1);
    await app.close();
  });

  it('POST /api/execute allows mainnet Stage 2 intents for allowlisted wallets', async () => {
    const auditStore = createInMemoryAuditStore();
    const app = buildServer({ auditStore, config: mainnetStage2Config });
    const res = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: { input: 'lend 1 usdc to aave', userAddress: USDC_RECIPIENT },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      ok: boolean;
      card?: { intent: string; batch?: { chainId: string; calls: Array<{ to: string }> }; gas_display?: string };
    };
    expect(body.ok).toBe(true);
    expect(body.card?.intent).toBe('LEND');
    expect(body.card?.batch?.chainId).toBe('0x2105');
    expect(body.card?.batch?.calls.at(-1)?.to).toBe(MAINNET_ROUTER);
    expect(body.card?.gas_display).toBe('user pays');
    await app.close();
  });

  it('POST /api/execute allows public mainnet Stage 2 intents when public mainnet is enabled', async () => {
    const auditStore = createInMemoryAuditStore();
    const app = buildServer({
      auditStore,
      config: {
        ...mainnetStage2Config,
        stage2BetaWallets: [],
        stage2PublicMainnetEnabled: true,
      },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: { input: 'lend 1 usdc to aave', userAddress: USDC_RECIPIENT },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      ok: boolean;
      card?: { intent: string; batch?: { chainId: string; calls: Array<{ to: string }> }; gas_display?: string };
    };
    expect(body.ok).toBe(true);
    expect(body.card?.intent).toBe('LEND');
    expect(body.card?.batch?.chainId).toBe('0x2105');
    expect(body.card?.batch?.calls.at(-1)?.to).toBe(MAINNET_ROUTER);
    expect(body.card?.gas_display).toBe('user pays');
    await app.close();
  });

  it('POST /api/execute blocks read-only positions execution', async () => {
    const app = buildServer({ config: offlineConfig });
    const res = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: { input: 'show my positions', userAddress: USDC_RECIPIENT },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      ok: false,
      error: expect.stringContaining('read-only'),
    });
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

  it('GET /api/balance/:addr targets Base mainnet when public Stage 2 mainnet is enabled', async () => {
    const app = buildServer({
      config: {
        ...offlineConfig,
        baseMainnetRpcUrl: 'https://mainnet.base.org',
        stage2PublicMainnetEnabled: true,
      },
    });
    const res = await app.inject({ method: 'GET', url: `/api/balance/${USDC_RECIPIENT}` });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { chain: string; stage?: string; balances: { ETH: string; USDC: string } };
    expect(body.stage).toBe('stub');
    expect(body.chain).toBe('base');
    expect(body.balances.USDC).toBe('0');
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

  it('GET /api/history/:addr includes confirmed Sherpa audit transactions', async () => {
    const auditStore = createInMemoryAuditStore();
    const app = buildServer({ auditStore, config: offlineConfig });
    const txHash = `0x${'b'.repeat(64)}` as const;

    const execute = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: {
        input: `send 1 usdc to ${USDC_RECIPIENT}`,
        userAddress: USDC_RECIPIENT,
      },
    });
    const executeBody = execute.json() as { auditLogId: number };
    await app.inject({
      method: 'POST',
      url: `/api/execute/${executeBody.auditLogId}/confirm`,
      payload: { txHash },
    });

    const res = await app.inject({ method: 'GET', url: `/api/history/${USDC_RECIPIENT}?limit=5` });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      items: Array<{
        amountDisplay: string;
        counterparty: string;
        sherpaIntent?: string;
        txHash: string;
      }>;
    };
    expect(body.items).toEqual([
      expect.objectContaining({
        amountDisplay: '1 USDC',
        counterparty: USDC_RECIPIENT,
        sherpaIntent: 'SEND',
        txHash,
      }),
    ]);
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

  it('GET /api/positions/:address returns serialized Aave account data', async () => {
    const fetchedAt = new Date('2026-05-16T00:00:00.000Z');
    const app = buildServer({
      config: offlineConfig,
      positionsReader: async () => ({
        totalCollateralBase: 1_000_000_000n,
        totalDebtBase: 250_000_000n,
        availableBorrowsBase: 500_000_000n,
        currentLiquidationThreshold: 8_250n,
        ltv: 7_800n,
        healthFactor: 3_300_000_000_000_000_000n,
        hasPosition: true,
        fetchedAt,
      }),
    });
    const res = await app.inject({ method: 'GET', url: `/api/positions/${USDC_RECIPIENT}` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      address: USDC_RECIPIENT.toLowerCase(),
      chain: 'base',
      totalCollateralBase: '1000000000',
      totalDebtBase: '250000000',
      availableBorrowsBase: '500000000',
      currentLiquidationThreshold: '8250',
      ltv: '7800',
      healthFactor: '3300000000000000000',
      hasPosition: true,
      fetchedAt: fetchedAt.toISOString(),
    });
    await app.close();
  });

  it('GET /api/positions/:address handles empty Aave positions', async () => {
    const app = buildServer({
      config: offlineConfig,
      positionsReader: async () => ({
        totalCollateralBase: 0n,
        totalDebtBase: 0n,
        availableBorrowsBase: 0n,
        currentLiquidationThreshold: 0n,
        ltv: 0n,
        healthFactor: 2n ** 256n - 1n,
        hasPosition: false,
        fetchedAt: new Date('2026-05-16T00:00:00.000Z'),
      }),
    });
    const res = await app.inject({ method: 'GET', url: `/api/positions/${USDC_RECIPIENT}` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      totalCollateralBase: '0',
      totalDebtBase: '0',
      hasPosition: false,
    });
    await app.close();
  });

  it('GET /api/positions/:address rejects malformed addresses', async () => {
    const positionsReader = vi.fn();
    const app = buildServer({ config: offlineConfig, positionsReader });
    const res = await app.inject({ method: 'GET', url: '/api/positions/not-an-address' });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'invalid_address' });
    expect(positionsReader).not.toHaveBeenCalled();
    await app.close();
  });

  it('GET /api/positions/:address caches results for 60 seconds', async () => {
    const positionsReader = vi.fn(async () => ({
      totalCollateralBase: 1n,
      totalDebtBase: 0n,
      availableBorrowsBase: 0n,
      currentLiquidationThreshold: 0n,
      ltv: 0n,
      healthFactor: 2n ** 256n - 1n,
      hasPosition: true,
      fetchedAt: new Date('2026-05-16T00:00:00.000Z'),
    }));
    const app = buildServer({ config: offlineConfig, positionsReader });
    const first = await app.inject({ method: 'GET', url: `/api/positions/${USDC_RECIPIENT}` });
    const second = await app.inject({ method: 'GET', url: `/api/positions/${USDC_RECIPIENT}` });
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(positionsReader).toHaveBeenCalledTimes(1);
    await app.close();
  });

  it('GET /api/positions/:address returns aave_query_failed on RPC failure', async () => {
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
      positionsReader: async () => {
        throw new Error('rpc unavailable');
      },
    });
    const res = await app.inject({ method: 'GET', url: `/api/positions/${USDC_RECIPIENT}` });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toMatchObject({ error: 'aave_query_failed', details: 'rpc unavailable' });
    expect(logger.warn).toHaveBeenCalledWith('positions fetch failed', expect.any(Object));
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

  it('POST /api/execute/:id/confirm records success or failure status from the payload', async () => {
    const auditStore = createInMemoryAuditStore();
    const app = buildServer({ auditStore });
    const txHash = `0x${'a'.repeat(64)}` as const;

    const successExecute = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: { input: `send 1 usdc to ${USDC_RECIPIENT}`, userAddress: USDC_RECIPIENT },
    });
    const successBody = successExecute.json() as { auditLogId: number };
    const successConfirm = await app.inject({
      method: 'POST',
      url: `/api/execute/${successBody.auditLogId}/confirm`,
      payload: { txHash },
    });

    const failedExecute = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: { input: `send 2 usdc to ${USDC_RECIPIENT}`, userAddress: USDC_RECIPIENT },
    });
    const failedBody = failedExecute.json() as { auditLogId: number };
    const failedConfirm = await app.inject({
      method: 'POST',
      url: `/api/execute/${failedBody.auditLogId}/confirm`,
      payload: { error: 'Wallet request was cancelled.' },
    });

    expect(successConfirm.statusCode).toBe(200);
    expect(failedConfirm.statusCode).toBe(200);
    const rows = await auditStore.list(USDC_RECIPIENT);
    expect(rows.find((row) => row.id === successBody.auditLogId)?.patch).toMatchObject({
      status: 'success',
      txHash,
    });
    expect(rows.find((row) => row.id === failedBody.auditLogId)?.patch).toMatchObject({
      error: 'Wallet request was cancelled.',
      status: 'failed',
    });
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
