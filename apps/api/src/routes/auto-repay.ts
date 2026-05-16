import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

const CreateAutoRepayBody = z.object({
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  triggerHF: z.number().min(1.0).max(2.0),
  targetHF: z.number().min(1.0).max(3.0),
  maxRepayPerExecution: z.string().max(80),
  repaySource: z.array(z.enum(['usdc', 'dai', 'sell-eth-then-usdc'])).default(['usdc']),
  maxPerDay: z.number().int().min(1).max(20).default(5),
}).refine((d) => d.targetHF > d.triggerHF, {
  message: 'targetHF must be greater than triggerHF',
});

const AddressParams = z.object({
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

const IdParams = z.object({
  id: z.string().uuid(),
});

const UpdateAutoRepayBody = z
  .object({
    triggerHF: z.number().min(1.0).max(2.0).optional(),
    targetHF: z.number().min(1.0).max(3.0).optional(),
    maxRepayPerExecution: z.string().max(80).optional(),
    repaySource: z.array(z.enum(['usdc', 'dai', 'sell-eth-then-usdc'])).optional(),
    status: z.enum(['active', 'paused', 'disabled']).optional(),
    maxPerDay: z.number().int().min(1).max(20).optional(),
  })
  .strict();

export async function autoRepayRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/auto-repay', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = CreateAutoRepayBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }
    return reply.status(201).send({
      id: crypto.randomUUID(),
      userAddress: parsed.data.userAddress,
      triggerHF: parsed.data.triggerHF,
      targetHF: parsed.data.targetHF,
      maxRepayPerExecution: parsed.data.maxRepayPerExecution,
      repaySource: parsed.data.repaySource,
      maxPerDay: parsed.data.maxPerDay,
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
    return reply.send({ rules: [], userAddress: params.data.userAddress });
  });

  app.patch('/api/auto-repay/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = IdParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid id' });
    }
    const body = UpdateAutoRepayBody.safeParse(req.body ?? {});
    if (!body.success) {
      return reply.status(400).send({ error: body.error.message });
    }
    return reply.send({
      id: params.data.id,
      ...body.data,
      updatedAt: new Date().toISOString(),
    });
  });

  app.delete('/api/auto-repay/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = IdParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid id' });
    }
    return reply.send({ id: params.data.id, status: 'disabled' });
  });

  app.get('/api/auto-repay/:id/history', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = IdParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid id' });
    }
    return reply.send({ executions: [], ruleId: params.data.id });
  });
}
