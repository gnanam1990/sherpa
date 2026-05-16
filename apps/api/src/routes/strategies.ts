import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

const CreateStrategyBody = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  creatorAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainId: z.number(),
  intents: z.array(z.object({ type: z.string(), template: z.string() })),
  parameters: z.record(z.any()).optional(),
  visibility: z.enum(['public', 'private', 'unlisted']).default('public'),
  tags: z.array(z.string()).default([]),
});

export async function strategyRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/strategies', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = CreateStrategyBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }
    return reply.code(501).send({ error: 'not_implemented', details: 'Strategy creation pending Stage 9.' });
  });

  app.get('/api/strategies', async (req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ strategies: [] });
  });

  app.get('/api/strategies/:id', async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.code(501).send({ error: 'not_implemented', details: 'Strategy lookup pending Stage 9.' });
  });

  app.post('/api/strategies/:id/follow', async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.code(501).send({ error: 'not_implemented', details: 'Strategy follow pending Stage 9.' });
  });

  app.post('/api/strategies/:id/run', async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.code(501).send({ error: 'not_implemented', details: 'Strategy execution pending Stage 9.' });
  });
}
