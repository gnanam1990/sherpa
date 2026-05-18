import { describe, test, expect, vi } from 'vitest';
import { SherpaClient, createSherpaClient } from './client.js';

describe('SherpaClient', () => {
  function mockFetch(response: unknown, status = 200) {
    return vi.fn(async () => ({
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify(response),
      json: async () => response,
    })) as unknown as typeof fetch;
  }

  const config = {
    baseUrl: 'https://sherpa.example.com',
    apiKey: 'sk_test123',
  };

  test('createSherpaClient returns SherpaClient', () => {
    const client = createSherpaClient(config);
    expect(client).toBeInstanceOf(SherpaClient);
  });

  test('parse sends correct request', async () => {
    const fetchFn = mockFetch({ intent: 'SEND', params: {}, confidence: 0.9, riskLevel: 'low' });
    const client = new SherpaClient(config, { fetch: fetchFn });

    const result = await client.parse({ input: 'send 10 USDC to alice' });

    expect(fetchFn).toHaveBeenCalledWith(
      'https://sherpa.example.com/api/parse',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer sk_test123',
        }),
      }),
    );
    expect(result.intent).toBe('SEND');
  });

  test('getBalance sends GET request', async () => {
    const fetchFn = mockFetch({ address: '0x123', ethWei: '1000', ethDisplay: '1 ETH', usdcBaseUnits: '0', usdcDisplay: '$0' });
    const client = new SherpaClient(config, { fetch: fetchFn });

    await client.getBalance('0x1234567890123456789012345678901234567890');

    expect(fetchFn).toHaveBeenCalledWith(
      'https://sherpa.example.com/api/balance/0x1234567890123456789012345678901234567890',
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  test('throws on non-ok response', async () => {
    const fetchFn = mockFetch({ error: 'not_found' }, 404);
    const client = new SherpaClient(config, { fetch: fetchFn });

    await expect(client.parse({ input: 'test' })).rejects.toThrow('Sherpa API error 404');
  });

  test('getPositions sends GET request', async () => {
    const fetchFn = mockFetch({ address: '0x123', hasPosition: false });
    const client = new SherpaClient(config, { fetch: fetchFn });

    const result = await client.getPositions('0x1234567890123456789012345678901234567890');
    expect(result.hasPosition).toBe(false);
  });

  test('getPortfolio sends GET request', async () => {
    const fetchFn = mockFetch({ address: '0x123', totalValueUsd: '0', chains: [] });
    const client = new SherpaClient(config, { fetch: fetchFn });

    const result = await client.getPortfolio('0x1234567890123456789012345678901234567890');
    expect(result.totalValueUsd).toBe('0');
  });

  test('checkSafety sends POST request', async () => {
    const fetchFn = mockFetch({ safe: true, riskLevel: 'low', warnings: [], ringResults: [] });
    const client = new SherpaClient(config, { fetch: fetchFn });

    const result = await client.checkSafety({
      to: '0x1234567890123456789012345678901234567890',
      data: '0xabcdef',
    });
    expect(result.safe).toBe(true);
  });

  test('createApiKey sends POST request', async () => {
    const fetchFn = mockFetch({ id: 'key-1', key: 'sk_abc', name: 'test', permissions: ['read'], rateLimit: 100 });
    const client = new SherpaClient(config, { fetch: fetchFn });

    const result = await client.createApiKey({ name: 'test', permissions: ['read'] });
    expect(result.key).toBe('sk_abc');
  });
});
