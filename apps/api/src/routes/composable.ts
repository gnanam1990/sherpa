import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

const FlashLoanBody = z.object({
  asset: z.string(),
  amount: z.string(),
  chainId: z.number(),
  purpose: z.string().optional(),
});

const LeverageBody = z.object({
  asset: z.string(),
  leverageRatio: z.number().min(1).max(5),
  collateralAsset: z.string(),
  chainId: z.number(),
});

export async function composableRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/composable/flash-loan', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = FlashLoanBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });

    return reply.send({
      id: 'stub-flash-loan-id',
      ...parsed.data,
      fee: '0.09%',
      status: 'ready',
    });
  });

  app.post('/api/composable/leverage', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = LeverageBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });

    return reply.send({
      id: 'stub-leverage-id',
      ...parsed.data,
      riskLevel: parsed.data.leverageRatio <= 2 ? 'low' : parsed.data.leverageRatio <= 3 ? 'medium' : 'high',
      liquidationPrice: '0',
      status: 'ready',
    });
  });

  app.get('/api/composable/strategies', async (req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      strategies: [
        { id: 'leveraged-lend', name: 'Leveraged Lending', description: 'Borrow and lend to maximize yield', risk: 'medium' },
        { id: 'flash-arb', name: 'Flash Loan Arbitrage', description: 'Arbitrage with flash loans', risk: 'high' },
        { id: 'debt-refinance', name: 'Debt Refinancing', description: 'Move debt to lower-rate protocol', risk: 'low' },
      ],
    });
  });
}
