import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

const VoteBody = z.object({
  proposalId: z.string(),
  voterAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  support: z.enum(['yes', 'no', 'abstain']),
  reason: z.string().optional(),
});

const ProposeBody = z.object({
  proposerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  actions: z.array(z.object({
    target: z.string(),
    value: z.string(),
    signature: z.string(),
    calldata: z.string(),
  })).default([]),
});

const DelegateBody = z.object({
  delegatorAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  delegateeAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainId: z.number(),
});

export async function governanceRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/governance/proposals', async (req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ proposals: [] });
  });

  app.get('/api/governance/proposals/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    return reply.send({ id, title: 'Stub Proposal', status: 'active' });
  });

  app.post('/api/governance/proposals', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = ProposeBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
    return reply.send({ id: 'stub-proposal-id', ...parsed.data, status: 'pending' });
  });

  app.post('/api/governance/vote', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = VoteBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
    return reply.send({ success: true, ...parsed.data });
  });

  app.post('/api/governance/delegate', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = DelegateBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
    return reply.send({ success: true, ...parsed.data });
  });
}
