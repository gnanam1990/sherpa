import { describe, it, expect } from 'vitest';
import { createFarcasterBackend } from './farcaster.js';

type Call = { url: string; headers: Record<string, string> };

function makeFetch(replies: Array<{ status?: number; body?: unknown; throws?: Error }>) {
  const calls: Call[] = [];
  let i = 0;
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : (input as URL).toString();
    const headers = (init?.headers ?? {}) as Record<string, string>;
    calls.push({ url, headers });
    const reply = replies[i++];
    if (!reply) throw new Error(`unscripted fetch: ${url}`);
    if (reply.throws) throw reply.throws;
    return new Response(JSON.stringify(reply.body ?? {}), {
      status: reply.status ?? 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  return { fetchImpl, calls };
}

describe('farcaster backend', () => {
  it('hits the v2 by_username endpoint with x-api-key and url-encoded handle', async () => {
    const { fetchImpl, calls } = makeFetch([
      {
        body: {
          user: {
            fid: 5650,
            username: 'vitalik.eth',
            verified_addresses: { eth_addresses: ['0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'] },
          },
        },
      },
    ]);
    const fc = createFarcasterBackend({
      apiKey: 'NEYNAR_KEY',
      baseUrl: 'https://api.neynar.com/',
      fetchImpl,
    });
    const out = await fc('vitalik.eth');
    expect(calls[0]!.url).toBe(
      'https://api.neynar.com/v2/farcaster/user/by_username?username=vitalik.eth',
    );
    expect(calls[0]!.headers['x-api-key']).toBe('NEYNAR_KEY');
    expect('address' in out).toBe(true);
    if ('address' in out) {
      expect(out.address).toBe('0xd8da6bf26964af9d7eed9e03e53415d37aa96045');
      expect(out.source).toBe('farcaster');
      expect(out.metadata?.farcaster_fid).toBe(5650);
    }
  });

  it('prefers verified_addresses over custody_address', async () => {
    const { fetchImpl } = makeFetch([
      {
        body: {
          user: {
            fid: 1,
            username: 'a',
            custody_address: '0x1111111111111111111111111111111111111111',
            verified_addresses: {
              eth_addresses: ['0x2222222222222222222222222222222222222222'],
            },
          },
        },
      },
    ]);
    const fc = createFarcasterBackend({ apiKey: 'k', fetchImpl });
    const out = await fc('a');
    if ('address' in out) {
      expect(out.address).toBe('0x2222222222222222222222222222222222222222');
    } else {
      throw new Error('expected resolved');
    }
  });

  it('falls back to custody_address when no verifieds', async () => {
    const { fetchImpl } = makeFetch([
      {
        body: {
          user: {
            fid: 2,
            username: 'b',
            custody_address: '0x3333333333333333333333333333333333333333',
            verified_addresses: { eth_addresses: [] },
          },
        },
      },
    ]);
    const fc = createFarcasterBackend({ apiKey: 'k', fetchImpl });
    const out = await fc('b');
    if ('address' in out) {
      expect(out.address).toBe('0x3333333333333333333333333333333333333333');
    } else {
      throw new Error('expected resolved');
    }
  });

  it('returns not_found on 404', async () => {
    const { fetchImpl } = makeFetch([{ status: 404, body: {} }]);
    const fc = createFarcasterBackend({ apiKey: 'k', fetchImpl });
    const out = await fc('nope');
    expect('type' in out && out.type).toBe('not_found');
  });

  it('returns api_error on 5xx with neynar provider tag', async () => {
    const { fetchImpl } = makeFetch([{ status: 503, body: {} }]);
    const fc = createFarcasterBackend({ apiKey: 'k', fetchImpl });
    const out = await fc('x');
    if ('type' in out) {
      expect(out.type).toBe('api_error');
      expect((out as { provider: string }).provider).toBe('neynar');
      expect((out as { message: string }).message).toContain('503');
    } else {
      throw new Error('expected error');
    }
  });

  it('returns api_error when fetch throws', async () => {
    const { fetchImpl } = makeFetch([{ throws: new Error('socket hang up') }]);
    const fc = createFarcasterBackend({ apiKey: 'k', fetchImpl });
    const out = await fc('x');
    expect('type' in out && (out as { type: string }).type).toBe('api_error');
  });

  it('returns not_found when verified is empty AND custody is missing', async () => {
    const { fetchImpl } = makeFetch([
      { body: { user: { fid: 3, username: 'c', verified_addresses: { eth_addresses: [] } } } },
    ]);
    const fc = createFarcasterBackend({ apiKey: 'k', fetchImpl });
    const out = await fc('c');
    expect('type' in out && (out as { type: string }).type).toBe('not_found');
  });
});
