import { describe, expect, test, vi } from 'vitest';
import { buildPolyForgeOrder, PolyForgeNotConfiguredError, searchMarkets } from './index.js';

describe('PolyForge market adapter', () => {
  test('throws when API URL is missing', async () => {
    await expect(searchMarkets({ query: 'ETH' })).rejects.toBeInstanceOf(PolyForgeNotConfiguredError);
  });

  test('fetches and normalizes markets from API', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      markets: [{
        id: 'market-1',
        title: 'Will ETH close above 5000?',
        resolution_date: '2026-12-31',
        yes_price: '4200',
        no_price: 5800,
        liquidity: '1000000',
        status: 'open',
      }],
    })));

    const markets = await searchMarkets(
      { query: 'ETH', limit: 1 },
      { apiUrl: 'https://polyforge.test', fetchImpl },
    );

    expect(markets).toEqual([{
      id: 'market-1',
      question: 'Will ETH close above 5000?',
      resolutionDate: '2026-12-31',
      yesPrice: 4200,
      noPrice: 5800,
      liquidity: 1000000n,
      status: 'open',
    }]);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://polyforge.test/markets?search=ETH&limit=1',
      { headers: {} },
    );
  });

  test('order builder fails closed until a contract encoder exists', () => {
    expect(() => buildPolyForgeOrder({
      market: {
        id: 'market-1',
        question: 'Will ETH close above 5000?',
        resolutionDate: '2026-12-31',
        yesPrice: 4200,
        noPrice: 5800,
        liquidity: 1000000n,
        status: 'open',
      },
      side: 'YES',
      amount: 100n,
    })).toThrow('polyforge_order_builder_not_configured');
  });
});
