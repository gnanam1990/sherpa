import Fastify, { type FastifyInstance } from 'fastify';
import { resolve } from '@sherpa/identity';

/**
 * Build the Fastify app. Exported so tests can drive it without binding to a
 * port. Routes are Week-1 stubs — real handlers land with M1's parser /
 * executor (Week 2+).
 */
export function buildServer(): FastifyInstance {
  const app = Fastify({ logger: false });

  app.get('/api/health', async () => ({ ok: true, ts: Date.now() }));

  app.post('/api/parse', async (_req, reply) => {
    return reply.code(501).send({ error: 'not_implemented', stage: 'week-1-scaffold' });
  });

  app.post('/api/execute', async (_req, reply) => {
    return reply.code(501).send({ error: 'not_implemented', stage: 'week-1-scaffold' });
  });

  app.get<{ Params: { addr: string } }>('/api/balance/:addr', async (req, reply) => {
    const resolved = await resolve(req.params.addr);
    if ('type' in resolved) {
      return reply.code(400).send({ error: resolved });
    }
    return reply.code(501).send({ error: 'not_implemented', address: resolved.address });
  });

  app.get<{ Params: { addr: string } }>('/api/history/:addr', async (req, reply) => {
    const resolved = await resolve(req.params.addr);
    if ('type' in resolved) {
      return reply.code(400).send({ error: resolved });
    }
    return reply.code(501).send({ error: 'not_implemented', address: resolved.address });
  });

  return app;
}
