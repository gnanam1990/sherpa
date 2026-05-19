import { afterEach, describe, expect, test, vi } from 'vitest';
import Fastify from 'fastify';
import { portfolioRoutes } from './portfolio.js';

const { fetchPortfolioMock } = vi.hoisted(() => ({
  fetchPortfolioMock: vi.fn(),
}));

vi.mock('@sherpa/tools', () => ({
  BASE_CHAIN_ID: 8453,
  SUPPORTED_PORTFOLIO_CHAIN_IDS: [8453, 1, 137, 10, 42161],
  fetchPortfolio: fetchPortfolioMock,
}));

const rpcUrl = 'https://example-rpc.invalid';

async function buildApp() {
  const app = Fastify();
  await portfolioRoutes(app, { rpcUrl });
  await app.ready();
  return app;
}

function snapshot(chainId: number, chainName: string, valueUsd: bigint) {
  return {
    chainId,
    chainName,
    timestamp: Date.parse('2026-05-19T12:00:00.000Z'),
    totalValueUsd: valueUsd,
    tokens: [
      {
        symbol: chainId === 137 ? 'MATIC' : 'ETH',
        address: 'native' as const,
        decimals: 18,
        chainId,
        balance: 1n * 10n ** 18n,
        priceUsd: chainId === 137 ? 1 : 3000,
        valueUsd,
      },
    ],
    positions: [],
  };
}

describe('portfolioRoutes', () => {
  afterEach(() => {
    fetchPortfolioMock.mockReset();
  });

  test('GET /api/portfolio/:address defaults to Base only', async () => {
    const app = await buildApp();
    const address = '0x1000000000000000000000000000000000000001';
    fetchPortfolioMock.mockResolvedValueOnce(snapshot(8453, 'Base', 3000n));

    const res = await app.inject({
      method: 'GET',
      url: `/api/portfolio/${address}`,
    });

    expect(res.statusCode).toBe(200);
    expect(fetchPortfolioMock).toHaveBeenCalledWith(address, { rpcUrl });
    expect(res.json()).toMatchObject({
      address,
      requestedChains: [8453],
      chains: [
        {
          chainId: 8453,
          chainName: 'Base',
          totalValueUsd: '3000',
        },
      ],
      totalValueUsd: '3000',
    });
    await app.close();
  });

  test('GET /api/portfolio/:address accepts multi-chain query and returns aggregate data', async () => {
    const app = await buildApp();
    const address = '0x2000000000000000000000000000000000000002';
    fetchPortfolioMock.mockResolvedValueOnce({
      timestamp: Date.parse('2026-05-19T12:00:00.000Z'),
      totalValueUsd: 6001n,
      tokens: [],
      positions: [],
      chains: [
        snapshot(8453, 'Base', 3000n),
        snapshot(1, 'Ethereum', 3000n),
        snapshot(137, 'Polygon', 1n),
        snapshot(10, 'Optimism', 0n),
        snapshot(42161, 'Arbitrum', 0n),
      ],
      errors: [],
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/portfolio/${address}?chains=1,137,10,42161,8453`,
    });

    expect(res.statusCode).toBe(200);
    expect(fetchPortfolioMock).toHaveBeenCalledWith(address, {
      rpcUrl,
      chains: [8453, 1, 137, 10, 42161],
    });
    const body = res.json();
    expect(body.requestedChains).toEqual([8453, 1, 137, 10, 42161]);
    expect(body.chains.map((chain: { chainId: number }) => chain.chainId)).toEqual([8453, 1, 137, 10, 42161]);
    expect(body.totalValueUsd).toBe('6001');
    await app.close();
  });

  test('GET /api/portfolio/:address rejects unsupported chains', async () => {
    const app = await buildApp();
    const address = '0x3000000000000000000000000000000000000003';

    const res = await app.inject({
      method: 'GET',
      url: `/api/portfolio/${address}?chains=8453,56,abc`,
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({
      error: 'invalid_chains',
      invalidChains: ['56', 'abc'],
      supportedChains: [8453, 1, 137, 10, 42161],
    });
    expect(fetchPortfolioMock).not.toHaveBeenCalled();
    await app.close();
  });

  test('caches by address and chain combination', async () => {
    const app = await buildApp();
    const address = '0x4000000000000000000000000000000000000004';
    fetchPortfolioMock
      .mockResolvedValueOnce(snapshot(8453, 'Base', 3000n))
      .mockResolvedValueOnce({
        timestamp: Date.parse('2026-05-19T12:00:00.000Z'),
        totalValueUsd: 6000n,
        tokens: [],
        positions: [],
        chains: [snapshot(8453, 'Base', 3000n), snapshot(1, 'Ethereum', 3000n)],
        errors: [],
      });

    const baseOnly = await app.inject({ method: 'GET', url: `/api/portfolio/${address}` });
    const multi = await app.inject({ method: 'GET', url: `/api/portfolio/${address}?chains=8453,1` });
    const multiCached = await app.inject({ method: 'GET', url: `/api/portfolio/${address}?chains=1,8453` });

    expect(baseOnly.statusCode).toBe(200);
    expect(multi.statusCode).toBe(200);
    expect(multiCached.statusCode).toBe(200);
    expect(fetchPortfolioMock).toHaveBeenCalledTimes(2);
    expect(multiCached.json().requestedChains).toEqual([8453, 1]);
    await app.close();
  });
});
