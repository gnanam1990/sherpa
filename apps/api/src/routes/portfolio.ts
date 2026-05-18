import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { fetchPortfolio } from '@sherpa/tools';
import type { PortfolioSnapshotStore } from '@sherpa/memory';

const addressPattern = /^0x[0-9a-fA-F]{40}$/;

const portfolioCache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL_MS = 60_000;

export async function portfolioRoutes(
  app: FastifyInstance,
  opts?: { rpcUrl?: string; snapshotStore?: PortfolioSnapshotStore },
): Promise<void> {
  const rpcUrl = opts?.rpcUrl;
  const snapshotStore = opts?.snapshotStore;

  app.get('/api/portfolio/:address', async (req: FastifyRequest, reply: FastifyReply) => {
    const { address } = req.params as { address: string };
    if (!addressPattern.test(address)) {
      return reply.code(400).send({ error: 'invalid_address' });
    }

    const cacheKey = `portfolio:${address.toLowerCase()}`;
    const cached = portfolioCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return reply.send(cached.data);
    }

    try {
      const snapshot = await fetchPortfolio(address as `0x${string}`, { rpcUrl });
      const data = {
        address,
        chains: [
          {
            chainId: 8453,
            chainName: 'Base',
            tokens: snapshot.tokens.map((t) => ({
              symbol: t.symbol,
              balance: t.balance.toString(),
              valueUsd: t.valueUsd.toString(),
              priceUsd: t.priceUsd,
            })),
            totalValueUsd: snapshot.totalValueUsd.toString(),
          },
        ],
        totalValueUsd: snapshot.totalValueUsd.toString(),
        totalPnlUsd: '0',
        totalPnlPercent: 0,
        lastUpdated: new Date(snapshot.timestamp).toISOString(),
      };
      portfolioCache.set(cacheKey, { data, expires: Date.now() + CACHE_TTL_MS });
      return reply.send(data);
    } catch (err) {
      return reply.code(500).send({
        error: 'portfolio_fetch_failed',
        details: (err as Error).message || 'unknown error',
      });
    }
  });

  app.get('/api/portfolio/:address/pnl', async (req: FastifyRequest, reply: FastifyReply) => {
    const { address } = req.params as { address: string };
    if (!addressPattern.test(address)) {
      return reply.code(400).send({ error: 'invalid_address' });
    }

    // PnL requires historical cost basis data which needs daily snapshots.
    // Return honest empty state until snapshot worker is built.
    return reply.send({
      address,
      realizedPnlUsd: '0',
      unrealizedPnlUsd: '0',
      totalPnlUsd: '0',
      totalPnlPercent: 0,
      bestPerformer: null,
      worstPerformer: null,
      note: 'PnL tracking requires daily portfolio snapshots. Data will populate once the snapshot worker starts recording.',
    });
  });

  app.get('/api/portfolio/:address/history', async (req: FastifyRequest, reply: FastifyReply) => {
    const { address } = req.params as { address: string };
    const { days } = req.query as { days?: string };
    if (!addressPattern.test(address)) {
      return reply.code(400).send({ error: 'invalid_address' });
    }

    if (snapshotStore) {
      try {
        const history = await snapshotStore.getSnapshotHistory(address, Number(days) || 30);
        return reply.send({
          address,
          period: `${days || 30} days`,
          snapshots: history.map((s) => ({
            timestamp: s.snapshot_at,
            valueUsd: s.total_value_usd,
          })),
        });
      } catch {
        // Fall through to empty state
      }
    }

    return reply.send({
      address,
      period: `${days || 30} days`,
      snapshots: [],
      note: 'Portfolio history will populate once daily snapshots start recording. No fabricated data.',
    });
  });
}
