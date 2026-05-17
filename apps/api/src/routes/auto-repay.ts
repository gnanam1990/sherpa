import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  InMemoryAutoRepayStore,
  type AutoRepayRuleRow,
  type AutoRepayStore,
} from '@sherpa/memory';
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

const defaultStore: AutoRepayStore = new InMemoryAutoRepayStore();

function serializeRule(rule: AutoRepayRuleRow) {
  return {
    id: rule.id,
    userAddress: rule.user_address,
    triggerHF: rule.trigger_hf,
    targetHF: rule.target_hf,
    maxRepayPerExecution: rule.max_repay_per_execution,
    repaySource: rule.repay_source,
    maxPerDay: rule.max_per_day,
    status: rule.status,
    consecutiveFailures: rule.consecutive_failures,
    totalRepayments: rule.total_repayments,
    totalRepaidUsd: rule.total_repaid_usd,
    authorizationTxHash: rule.authorization_tx_hash,
    createdAt: rule.created_at,
    lastEvaluatedAt: rule.last_evaluated_at,
    lastTriggeredAt: rule.last_triggered_at,
  };
}

export async function autoRepayRoutes(
  app: FastifyInstance,
  maybeStore: AutoRepayStore = defaultStore,
): Promise<void> {
  const store = 'createRule' in maybeStore ? maybeStore : defaultStore;

  app.post('/api/auto-repay', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = CreateAutoRepayBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }
    const rule = await store.createRule({
      userAddress: parsed.data.userAddress,
      triggerHf: parsed.data.triggerHF,
      targetHf: parsed.data.targetHF,
      maxRepayPerExecution: parsed.data.maxRepayPerExecution,
      repaySource: parsed.data.repaySource,
      maxPerDay: parsed.data.maxPerDay,
    });
    return reply.status(201).send(serializeRule(rule));
  });

  app.get('/api/auto-repay/:userAddress', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = AddressParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid userAddress' });
    }
    const rules = await store.getRulesByUser(params.data.userAddress);
    return reply.send({
      rules: rules.map(serializeRule),
      userAddress: params.data.userAddress,
      persistence: 'process-memory',
    });
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
    const rule = await store.updateRule(params.data.id, {
      triggerHf: body.data.triggerHF,
      targetHf: body.data.targetHF,
      maxRepayPerExecution: body.data.maxRepayPerExecution,
      repaySource: body.data.repaySource,
      status: body.data.status,
      maxPerDay: body.data.maxPerDay,
    });
    if (!rule) {
      return reply.status(404).send({ error: 'Auto-repay rule not found' });
    }
    return reply.send(serializeRule(rule));
  });

  app.delete('/api/auto-repay/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = IdParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid id' });
    }
    const deleted = await store.deleteRule(params.data.id);
    if (!deleted) {
      return reply.status(404).send({ error: 'Auto-repay rule not found' });
    }
    return reply.send({ id: params.data.id, status: 'disabled' });
  });

  app.get('/api/auto-repay/:id/history', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = IdParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid id' });
    }
    const rule = await store.getRuleById(params.data.id);
    if (!rule) {
      return reply.status(404).send({ error: 'Auto-repay rule not found' });
    }
    const executions = await store.getExecutionHistory(params.data.id);
    return reply.send({ executions, ruleId: params.data.id });
  });
}
