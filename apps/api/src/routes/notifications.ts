import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

const SubscribeBody = z.object({
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  channel: z.enum(['push', 'email', 'farcaster', 'telegram']),
  condition: z.string().optional(),
});

export async function notificationRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/notifications/subscribe', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = SubscribeBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }
    return reply.send({
      id: 'stub-subscription-id',
      ...parsed.data,
      enabled: true,
      triggerCount: 0,
      createdAt: new Date().toISOString(),
    });
  });

  app.get('/api/notifications/:userAddress', async (req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ subscriptions: [], recentNotifications: [] });
  });

  app.post('/api/notifications/send', async (req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ success: true, messageId: 'stub-msg-id' });
  });

  app.post('/api/notifications/:id/unsubscribe', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    return reply.send({ id, enabled: false });
  });
}
