import { describe, test, expect, vi } from 'vitest';
import { SherpaClient, createSherpaClient } from './client.js';

describe('SherpaClient', () => {
  test('creates client with config', () => {
    const client = createSherpaClient({
      apiKey: 'sk_test',
      baseUrl: 'https://api.sherpa.xyz',
    });
    expect(client).toBeInstanceOf(SherpaClient);
  });

  test('parse sends correct request', async () => {
    const mockFetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ intent: 'SEND', params: {}, confidence: 0.9 }),
    }));

    const client = new SherpaClient(
      { apiKey: 'sk_test', baseUrl: 'https://api.sherpa.xyz' },
      { fetch: mockFetch as any },
    );

    const result = await client.parse({ input: 'send 0.1 ETH' });
    expect(result.intent).toBe('SEND');
    expect(mockFetch).toHaveBeenCalled();
  });
});
