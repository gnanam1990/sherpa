import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

const CreateSessionKeyBody = z.object({
  ownerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainId: z.number(),
  spendLimit: z.string(),
  validDuration: z.number().min(60).max(30 * 24 * 60 * 60),
  permissions: z.array(z.object({
    target: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    selector: z.string().regex(/^0x[a-fA-F0-9]{8}$/),
    maxValue: z.string(),
  })),
});

export async function sessionKeyRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/session-keys', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = CreateSessionKeyBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }

    return reply.send({
      id: 'stub-session-key-id',
      sessionKeyAddress: '0x' + '00'.repeat(20),
      ...parsed.data,
      status: 'active',
      spentAmount: '0',
      executionCount: 0,
      createdAt: new Date().toISOString(),
    });
  });

  app.get('/api/session-keys/:ownerAddress', async (req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ sessionKeys: [] });
  });

  app.post('/api/session-keys/:id/revoke', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    return reply.send({ id, status: 'revoked' });
  });

  app.post('/api/session-keys/:id/extend', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const body = req.body as any;
    return reply.send({ id, validUntil: body?.validUntil || new Date().toISOString() });
  });
}
