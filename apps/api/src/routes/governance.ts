import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  snapshot,
  aaveGov,
  compoundGov,
  optimismGov,
  delegation,
} from '@sherpa/tools';

const VoteBody = z.object({
  proposalId: z.string(),
  voterAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  support: z.enum(['yes', 'no', 'abstain']),
  reason: z.string().optional(),
  source: z.enum(['snapshot', 'aave', 'compound', 'optimism']).default('snapshot'),
  space: z.string().optional(),
});

const ProposeBody = z.object({
  proposerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  actions: z.array(z.object({
    target: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    value: z.string().regex(/^\d+$/),
    signature: z.string().max(200),
    calldata: z.string().regex(/^0x[a-fA-F0-9]*$/),
  })).default([]),
});

const DelegateBody = z.object({
  delegatorAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  delegateeAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  protocol: z.enum(['aave', 'compound', 'optimism']),
  chainId: z.number().default(1),
});

const SnapshotVoteBody = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  space: z.string(),
  proposalId: z.string(),
  choice: z.number(),
  signature: z.string(),
  reason: z.string().optional(),
});

type GovernanceSource = 'snapshot' | 'aave' | 'compound' | 'optimism';
type DraftProposal = z.infer<typeof ProposeBody> & {
  id: string;
  status: 'draft';
  createdAt: string;
  executionEnabled: false;
};

const draftProposals = new Map<string, DraftProposal>();

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function governanceRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/governance/proposals', async (req: FastifyRequest, reply: FastifyReply) => {
    const { source, space } = req.query as { source?: GovernanceSource; space?: string };
    const sources: GovernanceSource[] = source
      ? [source]
      : ['snapshot', 'aave', 'compound', 'optimism'];
    const proposals: unknown[] = [];
    const errors: Array<{ source: GovernanceSource; error: string }> = [];

    await Promise.all(
      sources.map(async (currentSource) => {
        try {
          if (currentSource === 'snapshot') {
        const snapshotSpace = space || snapshot.SNAPSHOT_SPACES.aave;
        const snapshotProposals = await snapshot.getProposals(snapshotSpace);
            proposals.push(
              ...snapshotProposals.map((p: Record<string, unknown>) => ({ ...p, source: 'snapshot' })),
            );
          }
          if (currentSource === 'aave') {
        const aaveProposals = await aaveGov.getProposals();
            proposals.push(...aaveProposals.map((p: Record<string, unknown>) => ({ ...p, source: 'aave' })));
          }
          if (currentSource === 'compound') {
        const compoundProposals = await compoundGov.getProposals();
            proposals.push(
              ...compoundProposals.map((p: Record<string, unknown>) => ({ ...p, source: 'compound' })),
            );
          }
          if (currentSource === 'optimism') {
        const optimismProposals = await optimismGov.getProposals();
            proposals.push(
              ...optimismProposals.map((p: Record<string, unknown>) => ({ ...p, source: 'optimism' })),
            );
          }
        } catch (err) {
          errors.push({ source: currentSource, error: errorMessage(err) });
        }
      }),
    );

    return reply.send({
      proposals,
      errors,
      status: errors.length > 0 ? 'partial' : 'ok',
    });
  });

  app.get('/api/governance/proposals/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const draft = draftProposals.get(id);
    if (draft) return reply.send({ ...draft, source: 'draft' });

    try {
      const [aave, compound, optimism] = await Promise.all([
        aaveGov.getProposals(),
        compoundGov.getProposals(),
        optimismGov.getProposals(),
      ]);
      const all = [...aave, ...compound, ...optimism];
      const found = all.find((p) => p.id === id);
      if (!found) return reply.status(404).send({ error: 'Proposal not found' });
      return reply.send(found);
    } catch (err: unknown) {
      return reply.status(500).send({ error: errorMessage(err) });
    }
  });

  app.post('/api/governance/proposals', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = ProposeBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });

    const proposal: DraftProposal = {
      ...parsed.data,
      proposerAddress: parsed.data.proposerAddress.toLowerCase(),
      id: `draft_${crypto.randomUUID()}`,
      status: 'draft',
      createdAt: new Date().toISOString(),
      executionEnabled: false,
    };
    draftProposals.set(proposal.id, proposal);

    return reply.code(201).send({
      proposal,
      warning: 'Draft saved only. Sherpa does not submit governance proposals on-chain from this endpoint.',
    });
  });

  app.post('/api/governance/vote', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = VoteBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
    try {
      if (parsed.data.source === 'snapshot') {
        const space = parsed.data.space || snapshot.SNAPSHOT_SPACES.aave;
        const choiceNum = parsed.data.support === 'yes' ? 1 : parsed.data.support === 'no' ? 2 : 3;
        const msg = snapshot.buildVoteMessage(space, parsed.data.proposalId, choiceNum);
        return reply.send({
          success: true,
          type: 'eip712',
          message: msg,
          voterAddress: parsed.data.voterAddress,
          proposalId: parsed.data.proposalId,
          support: parsed.data.support,
        });
      }
      if (parsed.data.source === 'aave') {
        const tx = aaveGov.buildVoteTx(parsed.data.proposalId, parsed.data.support, parsed.data.reason);
        return reply.send({ success: true, type: 'transaction', tx: { ...tx, value: tx.value.toString() }, ...parsed.data });
      }
      if (parsed.data.source === 'compound') {
        const tx = compoundGov.buildVoteTx(parsed.data.proposalId, parsed.data.support, parsed.data.reason);
        return reply.send({ success: true, type: 'transaction', tx: { ...tx, value: tx.value.toString() }, ...parsed.data });
      }
      if (parsed.data.source === 'optimism') {
        const tx = optimismGov.buildVoteTx(parsed.data.proposalId, parsed.data.support, parsed.data.reason);
        return reply.send({ success: true, type: 'transaction', tx: { ...tx, value: tx.value.toString() }, ...parsed.data });
      }
      return reply.send({ success: true, ...parsed.data });
    } catch (err: unknown) {
      return reply.status(500).send({ error: errorMessage(err) });
    }
  });

  app.post('/api/governance/vote/snapshot', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = SnapshotVoteBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
    try {
      const result = await snapshot.submitVote(
        parsed.data.address,
        parsed.data.space,
        parsed.data.proposalId,
        parsed.data.choice,
        parsed.data.signature,
        parsed.data.reason,
      );
      return reply.send({ success: true, id: result.id });
    } catch (err: unknown) {
      return reply.status(500).send({ error: errorMessage(err) });
    }
  });

  app.get('/api/governance/votes/:address', async (req: FastifyRequest, reply: FastifyReply) => {
    const { address } = req.params as { address: string };
    try {
      const votes = await snapshot.getVotesByAddress(address);
      return reply.send({ address, votes });
    } catch (err: unknown) {
      return reply.status(500).send({ error: errorMessage(err) });
    }
  });

  app.post('/api/governance/delegate', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = DelegateBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
    try {
      const result = delegation.delegate(
        parsed.data.delegatorAddress as `0x${string}`,
        parsed.data.delegateeAddress as `0x${string}`,
        parsed.data.protocol,
      );
      return reply.send({
        success: true,
        to: result.to,
        data: result.data,
        value: result.value.toString(),
        protocol: result.protocol,
        delegator: result.delegator,
        delegatee: result.delegatee,
      });
    } catch (err: unknown) {
      return reply.status(500).send({ error: errorMessage(err) });
    }
  });

  app.get('/api/governance/delegations/:address', async (req: FastifyRequest, reply: FastifyReply) => {
    const { address } = req.params as { address: string };
    try {
      const protocols: delegation.Protocol[] = ['aave', 'compound', 'optimism'];
      const statuses = await Promise.all(
        protocols.map((p) => delegation.getDelegation(address as `0x${string}`, p)),
      );
      return reply.send({ address, delegations: statuses });
    } catch (err: unknown) {
      return reply.status(500).send({ error: errorMessage(err) });
    }
  });

  app.post('/api/governance/delegate/revoke', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = z.object({
      delegatorAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      protocol: z.enum(['aave', 'compound', 'optimism']),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.message });
    try {
      const result = delegation.revokeDelegation(
        body.data.delegatorAddress as `0x${string}`,
        body.data.protocol,
      );
      return reply.send({
        success: true,
        to: result.to,
        data: result.data,
        value: result.value.toString(),
        protocol: result.protocol,
        delegator: result.delegator,
        delegatee: result.delegatee,
      });
    } catch (err: unknown) {
      return reply.status(500).send({ error: errorMessage(err) });
    }
  });

  app.get('/api/governance/spaces', async (req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ spaces: snapshot.SNAPSHOT_SPACES });
  });
}
