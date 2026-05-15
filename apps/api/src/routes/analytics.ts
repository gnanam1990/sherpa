import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function analyticsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/analytics/:address/volume', async (req: FastifyRequest, reply: FastifyReply) => {
    const { address } = req.params as { address: string };
    const { period } = req.query as { period?: string };

    return reply.send({
      address,
      period: period || 'all',
      totalVolume: '150000000000',
      totalVolumeUsd: '150000',
      dailyAverage: '5000',
      peakDay: { date: '2026-05-10', volume: '25000' },
    });
  });

  app.get('/api/analytics/:address/fees', async (req: FastifyRequest, reply: FastifyReply) => {
    const { address } = req.params as { address: string };

    return reply.send({
      address,
      totalFeesPaid: '150',
      protocolFees: '150',
      gasFees: '0',
      averageFeePerTx: '0.15',
    });
  });

  app.get('/api/analytics/:address/stats', async (req: FastifyRequest, reply: FastifyReply) => {
    const { address } = req.params as { address: string };

    return reply.send({
      address,
      totalTransactions: 1000,
      successRate: 98.5,
      uniqueIntents: 8,
      mostUsedIntent: { intent: 'SWAP', count: 450 },
      activeDays: 45,
    });
  });

  app.get('/api/analytics/global', async (req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      totalUsers: 5000,
      totalVolume: '10000000',
      totalTransactions: 50000,
      topIntents: [
        { intent: 'SWAP', count: 20000 },
        { intent: 'SEND', count: 15000 },
        { intent: 'LEND', count: 8000 },
      ],
    });
  });
}
