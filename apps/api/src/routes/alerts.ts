import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

const CreateAlertBody = z.object({
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  conditionType: z.enum(['price', 'balance', 'health-factor']),
  asset: z.string().optional(),
  comparison: z.enum(['>', '<', '>=', '<=', '==', 'cross-above', 'cross-below']),
  threshold: z.number(),
  notificationChannels: z
    .array(z.enum(['email', 'push', 'farcaster', 'telegram']))
    .default(['push']),
  triggeredIntent: z.string().optional(),
});

const AddressParams = z.object({
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

const IdParams = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
});

const UpdateAlertBody = z
  .object({
    status: z.enum(['active', 'paused', 'cancelled']).optional(),
    threshold: z.number().optional(),
    notificationChannels: z.array(z.enum(['email', 'push', 'farcaster', 'telegram'])).optional(),
  })
  .strict();

export async function alertRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/alerts', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = CreateAlertBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }
    return reply.send({
      id: 'stub-alert-id',
      ...parsed.data,
      status: 'active',
      triggerCount: 0,
      createdAt: new Date().toISOString(),
    });
  });

  app.get('/api/alerts/:userAddress', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = AddressParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid userAddress' });
    }
    return reply.send({ alerts: [] });
  });

  app.patch('/api/alerts/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = IdParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid id' });
    }
    const body = UpdateAlertBody.safeParse(req.body ?? {});
    if (!body.success) {
      return reply.status(400).send({ error: 'invalid body' });
    }
    return reply.send({ id: params.data.id, ...body.data, status: body.data.status ?? 'updated' });
  });

  app.delete('/api/alerts/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = IdParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid id' });
    }
    return reply.send({ id: params.data.id, status: 'cancelled' });
  });
}
