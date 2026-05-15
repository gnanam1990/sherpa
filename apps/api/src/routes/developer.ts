import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

const CreateApiKeyBody = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.string()).default(['read']),
  rateLimit: z.number().min(1).max(10000).default(1000),
});

const CreateWebhookBody = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  secret: z.string().optional(),
});

export async function developerRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/developer/keys', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = CreateApiKeyBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });

    return reply.send({
      id: 'stub-key-id',
      key: 'sk_' + 'x'.repeat(48),
      ...parsed.data,
      usageCount: 0,
      createdAt: new Date().toISOString(),
    });
  });

  app.get('/api/developer/keys', async (req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ keys: [] });
  });

  app.delete('/api/developer/keys/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    return reply.send({ id, revoked: true });
  });

  app.post('/api/developer/webhooks', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = CreateWebhookBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });

    return reply.send({
      id: 'stub-webhook-id',
      secret: 'whsec_' + 'x'.repeat(32),
      ...parsed.data,
      status: 'active',
      createdAt: new Date().toISOString(),
    });
  });

  app.get('/api/developer/webhooks', async (req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ webhooks: [] });
  });

  app.delete('/api/developer/webhooks/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    return reply.send({ id, deleted: true });
  });

  app.get('/api/developer/docs', async (req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      openapi: '3.0.0',
      info: { title: 'Sherpa API', version: '1.0.0' },
      servers: [{ url: 'https://sherpa-api.up.railway.app' }],
      paths: {},
    });
  });

  app.get('/api/developer/usage', async (req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      totalRequests: 0,
      requestsToday: 0,
      rateLimitRemaining: 1000,
      plan: 'free',
    });
  });
}
