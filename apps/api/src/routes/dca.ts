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
    const { userAddress: _userAddress } = req.params as { userAddress: string };
    return reply.send({ schedules: [] });
  });

  app.patch('/api/dca/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const body = req.body as any;
    return reply.send({ id, ...body });
  });

  app.delete('/api/dca/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    return reply.send({ id, status: 'cancelled' });
  });
}
