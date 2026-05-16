import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

const CreateDCABody = z.object({
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  fromAsset: z.string(),
  toAsset: z.string(),
  amountPerTick: z.string(),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  dayOfWeek: z.number().min(0).max(6).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  hourOfDay: z.number().min(0).max(23).default(12),
  totalBudget: z.string().optional(),
  maxExecutions: z.number().optional(),
});

const AddressParams = z.object({
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

const IdParams = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
});

const UpdateDCABody = z
  .object({
    amountPerTick: z.string().max(80).optional(),
    frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
    dayOfWeek: z.number().min(0).max(6).optional(),
    dayOfMonth: z.number().min(1).max(31).optional(),
    hourOfDay: z.number().min(0).max(23).optional(),
    totalBudget: z.string().max(80).optional(),
    maxExecutions: z.number().optional(),
    status: z.enum(['active', 'paused', 'cancelled']).optional(),
  })
  .strict();

export async function dcaRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/dca', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = CreateDCABody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }

    return reply.send({
      id: 'stub-dca-id',
      ...parsed.data,
      status: 'active',
      totalExecutions: 0,
      createdAt: new Date().toISOString(),
    });
  });

  app.get('/api/dca/:userAddress', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = AddressParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid userAddress' });
    }
    return reply.send({ schedules: [] });
  });

  app.patch('/api/dca/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = IdParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid id' });
    }
    const body = UpdateDCABody.safeParse(req.body ?? {});
    if (!body.success) {
      return reply.status(400).send({ error: 'invalid body' });
    }
    return reply.send({ id: params.data.id, ...body.data, status: body.data.status ?? 'updated' });
  });

  app.delete('/api/dca/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = IdParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid id' });
    }
    return reply.send({ id: params.data.id, status: 'cancelled' });
  });
}
