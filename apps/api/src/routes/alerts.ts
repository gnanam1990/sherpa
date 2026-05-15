import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

const CreateAlertBody = z.object({
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  conditionType: z.enum(['price', 'balance', 'health-factor']),
  asset: z.string().optional(),
  comparison: z.enum(['>', '<', '>=', '<=', '==', 'cross-above', 'cross-below']),
  threshold: z.number(),
  notificationChannels: z.array(z.enum(['email', 'push', 'farcaster', 'telegram'])).default(['push']),
  triggeredIntent: z.string().optional(),
});

export async function alertRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/alerts', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = CreateAlertBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }
    return reply.send({ id: 'stub-alert-id', ...parsed.data, status: 'active', triggerCount: 0, createdAt: new Date().toISOString() });
  });

  app.get('/api/alerts/:userAddress', async (req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ alerts: [] });
  });

  app.patch('/api/alerts/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    return reply.send({ id, ...(req.body as any) });
  });

  app.delete('/api/alerts/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    return reply.send({ id, status: 'cancelled' });
  });
}
