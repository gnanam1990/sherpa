import { describe, test, expect } from 'vitest';
import { searchMarkets, LimitlessNotConfiguredError } from './markets.js';

describe('Limitless markets', () => {
  test('throws when not configured', async () => {
    await expect(searchMarkets({ query: 'BTC' })).rejects.toThrow(LimitlessNotConfiguredError);
  });

  test('returns markets matching query', async () => {
    const sampleRow = {
      id: `0x${'a'.repeat(64)}`,
      question: 'Will BTC hit 200k?',
      resolutionDate: '2026-12-31',
      yesPrice: 0.25,
      noPrice: 0.75,
      liquidity: '1000000',
      volume: '50000',
      status: 'open',
    };
    const fakeFetch: typeof fetch = async () =>
      new Response(JSON.stringify([sampleRow]), { status: 200 });

    const markets = await searchMarkets(
      { query: 'BTC' },
      { apiUrl: 'https://api.limitless.exchange', fetchImpl: fakeFetch },
    );
    expect(markets.length).toBe(1);
    expect(markets[0]?.question).toBe('Will BTC hit 200k?');
  });

  test('returns empty for non-matching query', async () => {
    const fakeFetch: typeof fetch = async () =>
      new Response(JSON.stringify([]), { status: 200 });

    const markets = await searchMarkets(
      { query: 'nonexistent' },
      { apiUrl: 'https://api.limitless.exchange', fetchImpl: fakeFetch },
    );
    expect(markets.length).toBe(0);
  });
});
