import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

const CreateSessionKeyBody = z.object({
  ownerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainId: z.number(),
  spendLimit: z.string(),
  validDuration: z
    .number()
    .min(60)
    .max(30 * 24 * 60 * 60),
  permissions: z.array(
    z.object({
      target: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      selector: z.string().regex(/^0x[a-fA-F0-9]{8}$/),
      maxValue: z.string(),
    }),
  ).min(1),
  scope: z
    .array(
      z.object({
        target: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
        functions: z.array(z.string()),
        maxValuePerTx: z.string().optional(),
      }),
    )
    .optional(),
  limits: z
    .object({
      perTxValue: z.string().optional(),
      dailyTotal: z.string().optional(),
      totalLimit: z.string().optional(),
      maxExecutionsPerDay: z.number().optional(),
    })
    .optional(),
  maxExecutions: z.number().min(1).max(100000).optional(),
});

const AddressParams = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

const IdParams = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
});

const UpdateLimitsBody = z.object({
  perTxValue: z.string().optional(),
  dailyTotal: z.string().optional(),
  totalLimit: z.string().optional(),
  maxExecutionsPerDay: z.number().optional(),
  spendLimit: z.string().optional(),
}).strict();

export async function sessionKeyRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/session-keys', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = CreateSessionKeyBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }

    const validFrom = new Date();
    const validUntil = new Date(Date.now() + parsed.data.validDuration * 1000);

    return reply.status(201).send({
      id: crypto.randomUUID(),
      sessionKeyAddress: '0x' + '00'.repeat(20),
      ...parsed.data,
      scope: parsed.data.scope ?? parsed.data.permissions.map((p) => ({
        target: p.target,
        functions: [p.selector],
        maxValuePerTx: p.maxValue,
      })),
      limits: parsed.data.limits ?? {},
      status: 'active',
      spentAmount: '0',
      executionCount: 0,
      validFrom: validFrom.toISOString(),
      validUntil: validUntil.toISOString(),
      createdAt: new Date().toISOString(),
    });
  });

  app.get('/api/session-keys/:address', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = AddressParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid address' });
    }
    return reply.send({ sessionKeys: [] });
  });

  app.patch('/api/session-keys/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = IdParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid id' });
    }
    const body = UpdateLimitsBody.safeParse(req.body ?? {});
    if (!body.success) {
      return reply.status(400).send({ error: body.error.message });
    }
    return reply.send({
      id: params.data.id,
      limits: body.data,
      updatedAt: new Date().toISOString(),
    });
  });

  app.delete('/api/session-keys/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = IdParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid id' });
    }
    return reply.send({ id: params.data.id, status: 'revoked' });
  });

  app.get('/api/session-keys/:id/usage', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = IdParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid id' });
    }
    return reply.send({
      id: params.data.id,
      totalTransactions: 0,
      totalGasUsed: '0',
      totalValueTransacted: '0',
      dailyUsage: [],
      status: 'active',
    });
  });
}
