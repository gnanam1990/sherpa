import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

const CreateAlertBody = z.object({
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  conditionType: z.enum([
    'price',
    'balance',
    'health-factor',
    'gas',
    'apy',
    'contract-event',
  ]),
  asset: z.string().optional(),
  comparison: z.enum(['>', '<', '>=', '<=', '==', 'cross-above', 'cross-below']),
  threshold: z.number(),
  notificationChannels: z
    .array(z.enum(['email', 'push', 'farcaster', 'telegram']))
    .default(['push']),
  triggeredIntent: z.string().optional(),
  params: z.record(z.unknown()).optional(),
  oneShot: z.boolean().default(false),
  cooldownSeconds: z.number().int().min(60).max(86400).default(3600),
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
    comparison: z.enum(['>', '<', '>=', '<=', '==', 'cross-above', 'cross-below']).optional(),
    notificationChannels: z.array(z.enum(['email', 'push', 'farcaster', 'telegram'])).optional(),
    oneShot: z.boolean().optional(),
    cooldownSeconds: z.number().int().min(60).max(86400).optional(),
  })
  .strict();

export async function alertRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/alerts', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = CreateAlertBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }
    const { params, ...rest } = parsed.data;
    return reply.status(201).send({
      id: crypto.randomUUID(),
      ...rest,
      params: params ?? {},
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
    return reply.send({ alerts: [], userAddress: params.data.userAddress });
  });

  app.get('/api/alerts/:id/history', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = IdParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid id' });
    }
    return reply.send({ evaluations: [], alertId: params.data.id });
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
    const status = body.data.status === 'cancelled' ? 'completed' : body.data.status;
    return reply.send({
      id: params.data.id,
      ...body.data,
      status: status ?? 'updated',
      updatedAt: new Date().toISOString(),
    });
  });

  app.delete('/api/alerts/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = IdParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid id' });
    }
    return reply.send({ id: params.data.id, status: 'cancelled' });
  });
}
