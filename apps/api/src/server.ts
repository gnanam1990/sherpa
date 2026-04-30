import Fastify, { type FastifyInstance } from 'fastify';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { loadConfig, type SherpaConfig } from '@sherpa/config';
import { parseDeterministic, plan, type ConfirmationCardProps } from '@sherpa/core';
import { resolve, isResolved } from '@sherpa/identity';
import {
  createAuditLog,
  createInMemoryAuditStore,
  createInMemoryRateLimiter,
  updateAuditLog,
  type AuditStore,
  type RateLimiter,
} from '@sherpa/memory';
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
};

function hashPlan(card: ConfirmationCardProps): string {
  const h = createHash('sha256');
  h.update(JSON.stringify(card, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)));
  return `0x${h.digest('hex')}`;
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
  const auditStore = options.auditStore ?? createInMemoryAuditStore();
  const rateLimiter = options.rateLimiter ?? createInMemoryRateLimiter();
  const config = options.config ?? loadConfig();
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
    const parsedIntent = parseDeterministic(parsed.data.input);
    const planResult = await plan(parsedIntent, {
      userKey: parsed.data.userKey,
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
    const parsedIntent = parseDeterministic(parsed.data.input);
    const planResult = await plan(parsedIntent, {
      userKey: parsed.data.userAddress,
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
    const resolved = await resolve(req.params.addr);
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

  app.get<{ Params: { addr: string }; Querystring: { limit?: string } }>(
    '/api/history/:addr',
    async (req, reply) => {
      const resolved = await resolve(req.params.addr);
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

  return app;
}
