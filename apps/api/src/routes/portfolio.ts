import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function portfolioRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/portfolio/:address', async (req: FastifyRequest, reply: FastifyReply) => {
    const { address } = req.params as { address: string };

    return reply.send({
      address,
      chains: [
        {
          chainId: 8453,
          chainName: 'Base',
          tokens: [
            { symbol: 'ETH', balance: '1000000000000000000', valueUsd: '3000000000', priceUsd: 3000 },
            { symbol: 'USDC', balance: '2000000000', valueUsd: '2000000000', priceUsd: 1 },
          ],
          totalValueUsd: '5000000000',
        },
      ],
      totalValueUsd: '5000000000',
      totalPnlUsd: '500000000',
      totalPnlPercent: 11.11,
      lastUpdated: new Date().toISOString(),
    });
  });

  app.get('/api/portfolio/:address/pnl', async (req: FastifyRequest, reply: FastifyReply) => {
    const { address } = req.params as { address: string };

    return reply.send({
      address,
      realizedPnlUsd: '100000000',
      unrealizedPnlUsd: '400000000',
      totalPnlUsd: '500000000',
      totalPnlPercent: 11.11,
      bestPerformer: { symbol: 'ETH', pnlPercent: 25.5 },
      worstPerformer: { symbol: 'USDC', pnlPercent: 0 },
    });
  });

  app.get('/api/portfolio/:address/history', async (req: FastifyRequest, reply: FastifyReply) => {
    const { address } = req.params as { address: string };
    const { days } = req.query as { days?: string };

    return reply.send({
      address,
      period: `${days || 30} days`,
      snapshots: [
        { timestamp: new Date(Date.now() - 7 * 86400000).toISOString(), valueUsd: '4500000000' },
        { timestamp: new Date(Date.now() - 1 * 86400000).toISOString(), valueUsd: '4800000000' },
        { timestamp: new Date().toISOString(), valueUsd: '5000000000' },
      ],
    });
  });
}
