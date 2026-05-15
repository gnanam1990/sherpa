import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

const CreateAutoRepayBody = z.object({
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  triggerHF: z.number(),
  targetHF: z.number(),
  maxRepayPerExecution: z.string(),
  repaySource: z.array(z.enum(['usdc', 'sell-eth-then-usdc'])).default(['usdc']),
});

export async function autoRepayRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/auto-repay', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = CreateAutoRepayBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }
    return reply.send({
      id: 'stub-auto-repay-id',
      ...parsed.data,
      status: 'active',
      consecutiveFailures: 0,
      totalRepayments: 0,
      totalRepaidUsd: '0',
      createdAt: new Date().toISOString(),
    });
  });

  app.get('/api/auto-repay/:userAddress', async (req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ rules: [] });
  });

  app.patch('/api/auto-repay/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    return reply.send({ id, ...(req.body as any) });
  });

  app.delete('/api/auto-repay/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    return reply.send({ id, status: 'disabled' });
  });
}
