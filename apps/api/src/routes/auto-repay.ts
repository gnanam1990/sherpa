import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

const CreateAutoRepayBody = z.object({
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  triggerHF: z.number(),
  targetHF: z.number(),
  maxRepayPerExecution: z.string(),
  repaySource: z.array(z.enum(['usdc', 'sell-eth-then-usdc'])).default(['usdc']),
});

const AddressParams = z.object({
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

const IdParams = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
});

const UpdateAutoRepayBody = z
  .object({
    triggerHF: z.number().optional(),
    targetHF: z.number().optional(),
    maxRepayPerExecution: z.string().max(80).optional(),
    repaySource: z.array(z.enum(['usdc', 'sell-eth-then-usdc'])).optional(),
    status: z.enum(['active', 'paused', 'disabled']).optional(),
  })
  .strict();

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
    const params = AddressParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid userAddress' });
    }
    return reply.send({ rules: [] });
  });

  app.patch('/api/auto-repay/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = IdParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid id' });
    }
    const body = UpdateAutoRepayBody.safeParse(req.body ?? {});
    if (!body.success) {
      return reply.status(400).send({ error: 'invalid body' });
    }
    return reply.send({ id: params.data.id, ...body.data, status: body.data.status ?? 'updated' });
  });

  app.delete('/api/auto-repay/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = IdParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid id' });
    }
    return reply.send({ id: params.data.id, status: 'disabled' });
  });
}
