import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

const CreateMultisigBody = z.object({
  threshold: z.number().min(1).max(10),
  signers: z.array(z.string().regex(/^0x[a-fA-F0-9]{40}$/)).min(1).max(10),
  chainId: z.number(),
});

const WhitelistBody = z.object({
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  targetAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

export async function securityRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/security/multisig', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = CreateMultisigBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
    return reply.code(501).send({ error: 'not_implemented', details: 'Multisig creation pending Stage 8.' });
  });

  app.get('/api/security/multisig/:address', async (req: FastifyRequest, reply: FastifyReply) => {
    const { address } = req.params as { address: string };
    return reply.send({ address, threshold: 2, signers: [], transactions: [] });
  });

  app.post('/api/security/whitelist', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = WhitelistBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });
    return reply.send({ success: true, ...parsed.data });
  });

  app.get('/api/security/whitelist/:userAddress', async (req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ addresses: [] });
  });

  app.get('/api/security/status/:userAddress', async (req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      multisigEnabled: false,
      hardwareWalletConnected: false,
      whitelistedAddresses: 0,
      dailySpendLimit: '10000',
      dailySpent: '0',
    });
  });
}
