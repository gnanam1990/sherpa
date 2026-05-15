import { describe, it, expect, vi } from 'vitest';
import { loadConfig } from '@sherpa/config';
import {
  createInMemoryAuditStore,
  createInMemoryPaymasterRateLimiter,
  type PaymasterRateLimiter,
} from '@sherpa/memory';
import { buildServer } from '../server.js';

/**
 * Tests for POST /api/paymaster. Mocks are smart — they assert the
 * upstream request shape (URL, headers, body) rather than blindly
 * scripting a result. A buggy route that forwards to the wrong URL or
 * strips the JSON-RPC body would fail these tests.
 */

const PAYMASTER_RPC = 'https://api.paymaster.example/v1/x?key=secret';
const SENDER = '0x0123456789abcdef0123456789abcdef01234567';

function offlineConfig() {
  return { ...loadConfig(), useRealRpc: false, paymasterRpcUrl: PAYMASTER_RPC } as const;
}

function stubData(sender: string = SENDER): {
  jsonrpc: '2.0';
  id: number;
  method: 'pm_getPaymasterStubData';
  params: [{
    sender: string;
    callData: string;
    nonce: string;
    initCode: string;
    callGasLimit: string;
    verificationGasLimit: string;
    preVerificationGas: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
    paymasterAndData: string;
    signature: string;
  }];
} {
  return {
    jsonrpc: '2.0',
    id: 1,
    method: 'pm_getPaymasterStubData',
    params: [{
      sender,
      callData: '0xdeadbeef',
      nonce: '0x0',
      initCode: '0x',
      callGasLimit: '0x0',
      verificationGasLimit: '0x0',
      preVerificationGas: '0x0',
      maxFeePerGas: '0x3b9aca00',
      maxPriorityFeePerGas: '0x3b9aca00',
      paymasterAndData: '0x',
      signature: '0x' + 'ab'.repeat(65),
    }],
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/paymaster', () => {
  it('forwards a valid request to SHERPA_PAYMASTER_RPC and returns the upstream JSON verbatim', async () => {
    const upstreamPayload = { jsonrpc: '2.0', id: 1, result: { paymaster: '0xabc' } };
    const fetchMock = vi.fn(async (url: unknown, init: unknown) => {
      // Smart-mock contract: the route MUST POST to the configured URL
      // with the verbatim JSON-RPC body and a JSON Content-Type. If the
      // route forwards somewhere else or mangles the body, fail here.
      expect(url).toBe(PAYMASTER_RPC);
      const i = init as RequestInit;
      expect(i.method).toBe('POST');
      expect((i.headers as Record<string, string>)['Content-Type']).toBe('application/json');
      expect(JSON.parse(i.body as string)).toEqual(stubData());
      return jsonResponse(200, upstreamPayload);
    });

    const app = buildServer({
      config: offlineConfig(),
      paymasterFetch: fetchMock as unknown as typeof globalThis.fetch,
    });
    const res = await app.inject({ method: 'POST', url: '/api/paymaster', payload: stubData() });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(upstreamPayload);
    expect(res.headers['x-sherpa-paymaster-remaining']).toBe('2 of 3');
    expect(res.headers['x-sherpa-paymaster-resets-at']).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await app.close();
  });

  it('rejects an unknown JSON-RPC method with 400 invalid_request', async () => {
    const fetchMock = vi.fn();
    const app = buildServer({
      config: offlineConfig(),
      paymasterFetch: fetchMock as unknown as typeof globalThis.fetch,
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/paymaster',
      payload: {
        jsonrpc: '2.0',
        id: 1,
        method: 'pm_unknown',
        params: [{
          sender: SENDER,
          callData: '0xdeadbeef',
          nonce: '0x0',
          initCode: '0x',
          callGasLimit: '0x0',
          verificationGasLimit: '0x0',
          preVerificationGas: '0x0',
          maxFeePerGas: '0x3b9aca00',
          maxPriorityFeePerGas: '0x3b9aca00',
          paymasterAndData: '0x',
          signature: '0x' + 'ab'.repeat(65),
        }],
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'invalid_request' });
    expect(fetchMock).not.toHaveBeenCalled();
    await app.close();
  });

  it('returns 400 invalid_request when the method field is missing entirely', async () => {
    const fetchMock = vi.fn();
    const app = buildServer({
      config: offlineConfig(),
      paymasterFetch: fetchMock as unknown as typeof globalThis.fetch,
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/paymaster',
      payload: {
        jsonrpc: '2.0',
        id: 1,
        params: [{
          sender: SENDER,
          callData: '0xdeadbeef',
          nonce: '0x0',
          initCode: '0x',
          callGasLimit: '0x0',
          verificationGasLimit: '0x0',
          preVerificationGas: '0x0',
          maxFeePerGas: '0x3b9aca00',
          maxPriorityFeePerGas: '0x3b9aca00',
          paymasterAndData: '0x',
          signature: '0x' + 'ab'.repeat(65),
        }],
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'invalid_request' });
    expect(fetchMock).not.toHaveBeenCalled();
    await app.close();
  });

  it('returns 400 invalid_request when params[0].sender is a non-hex string', async () => {
    const fetchMock = vi.fn();
    const app = buildServer({
      config: offlineConfig(),
      paymasterFetch: fetchMock as unknown as typeof globalThis.fetch,
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/paymaster',
      payload: {
        jsonrpc: '2.0',
        id: 1,
        method: 'pm_getPaymasterStubData',
        params: [{
          sender: 'not-an-address',
          callData: '0xdeadbeef',
          nonce: '0x0',
          initCode: '0x',
          callGasLimit: '0x0',
          verificationGasLimit: '0x0',
          preVerificationGas: '0x0',
          maxFeePerGas: '0x3b9aca00',
          maxPriorityFeePerGas: '0x3b9aca00',
          paymasterAndData: '0x',
          signature: '0x' + 'ab'.repeat(65),
        }],
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'invalid_request' });
    expect(fetchMock).not.toHaveBeenCalled();
    await app.close();
  });

  it('returns 401 unauthorized when params[0].sender is missing', async () => {
    const fetchMock = vi.fn();
    const app = buildServer({
      config: offlineConfig(),
      paymasterFetch: fetchMock as unknown as typeof globalThis.fetch,
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/paymaster',
      payload: {
        jsonrpc: '2.0',
        id: 1,
        method: 'pm_getPaymasterStubData',
        params: [{
          callData: '0xdeadbeef',
          nonce: '0x0',
          initCode: '0x',
          callGasLimit: '0x0',
          verificationGasLimit: '0x0',
          preVerificationGas: '0x0',
          maxFeePerGas: '0x3b9aca00',
          maxPriorityFeePerGas: '0x3b9aca00',
          paymasterAndData: '0x',
          signature: '0x' + 'ab'.repeat(65),
        }],
      },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: 'unauthorized' });
    expect(fetchMock).not.toHaveBeenCalled();
    await app.close();
  });

  it('returns 429 rate_limit + resets_at on the 4th call within 24h, and does NOT call upstream', async () => {
    const upstreamCalls = vi.fn(async () =>
      jsonResponse(200, { jsonrpc: '2.0', id: 1, result: { paymaster: '0xabc' } }),
    );
    const app = buildServer({
      config: offlineConfig(),
      paymasterFetch: upstreamCalls as unknown as typeof globalThis.fetch,
    });
    for (let i = 0; i < 3; i++) {
      const ok = await app.inject({ method: 'POST', url: '/api/paymaster', payload: stubData() });
      expect(ok.statusCode).toBe(200);
    }
    const denied = await app.inject({
      method: 'POST',
      url: '/api/paymaster',
      payload: stubData(),
    });
    expect(denied.statusCode).toBe(429);
    const body = denied.json() as { error: string; resets_at: string };
    expect(body.error).toBe('rate_limit');
    expect(body.resets_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(denied.headers['x-sherpa-paymaster-resets-at']).toBe(body.resets_at);
    // Upstream forwarded only for the 3 allowed calls.
    expect(upstreamCalls).toHaveBeenCalledTimes(3);
    await app.close();
  });

  it('returns 502 + refunds rate-limit credit when upstream responds 500', async () => {
    let upstreamHits = 0;
    const fetchMock = vi.fn(async () => {
      upstreamHits += 1;
      return jsonResponse(500, { error: 'upstream boom' });
    });
    const auditStore = createInMemoryAuditStore();
    const rateLimiter = createInMemoryPaymasterRateLimiter();
    const app = buildServer({
      config: offlineConfig(),
      auditStore,
      paymasterRateLimiter: rateLimiter,
      paymasterFetch: fetchMock as unknown as typeof globalThis.fetch,
    });

    const res = await app.inject({ method: 'POST', url: '/api/paymaster', payload: stubData() });
    expect(res.statusCode).toBe(502);
    expect(res.json()).toEqual({ error: 'paymaster_upstream_error' });
    // The upstream URL must never leak in the client-facing error body.
    expect(JSON.stringify(res.json())).not.toContain('paymaster.example');

    // Refund: a follow-up consume should report remaining = 2.
    // Without the refund the bucket would still hold the failed call's
    // increment (count=1), so this consume would push count to 2 and
    // report remaining=1 — that's the bug we're guarding against.
    const r = await rateLimiter.consume(SENDER);
    expect(r.ok && r.remaining).toBe(2);
    expect(upstreamHits).toBe(1);

    const rows = await auditStore.list(SENDER as `0x${string}`);
    expect(rows.length).toBe(1);
    expect(rows[0]!.patch.status).toBe('failed');
    await app.close();
  });

  it('returns 502 + refunds rate-limit credit when the fetch throws (network/timeout)', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('ECONNRESET');
    });
    const rateLimiter = createInMemoryPaymasterRateLimiter();
    const auditStore = createInMemoryAuditStore();
    const app = buildServer({
      config: offlineConfig(),
      auditStore,
      paymasterRateLimiter: rateLimiter,
      paymasterFetch: fetchMock as unknown as typeof globalThis.fetch,
    });

    const res = await app.inject({ method: 'POST', url: '/api/paymaster', payload: stubData() });
    expect(res.statusCode).toBe(502);
    expect(res.json()).toEqual({ error: 'paymaster_upstream_error' });
    // The thrown Error message must never leak — it can carry the
    // upstream host (e.g. "ECONNREFUSED 1.2.3.4:443").
    expect(JSON.stringify(res.json())).not.toContain('ECONNRESET');

    const r = await rateLimiter.consume(SENDER);
    expect(r.ok && r.remaining).toBe(2);

    const rows = await auditStore.list(SENDER as `0x${string}`);
    expect(rows[0]!.patch.status).toBe('failed');
    await app.close();
  });

  it('writes one audit_log row per call with surface=paymaster, lowercased sender, and a truncated intent', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { jsonrpc: '2.0', id: 1, result: {} }));
    const auditStore = createInMemoryAuditStore();
    const app = buildServer({
      config: offlineConfig(),
      auditStore,
      paymasterFetch: fetchMock as unknown as typeof globalThis.fetch,
    });

    // Mixed-case sender on the wire — audit row must store it lowercased.
    const mixedCaseSender = '0xABCDEF0123456789ABCDEF0123456789ABCDEF01';
    const longCallData = '0x' + 'ab'.repeat(200);
    const res = await app.inject({
      method: 'POST',
      url: '/api/paymaster',
      payload: {
        jsonrpc: '2.0',
        id: 1,
        method: 'pm_getPaymasterData',
        params: [{
          sender: mixedCaseSender,
          callData: longCallData,
          nonce: '0x0',
          initCode: '0x',
          callGasLimit: '0x0',
          verificationGasLimit: '0x0',
          preVerificationGas: '0x0',
          maxFeePerGas: '0x3b9aca00',
          maxPriorityFeePerGas: '0x3b9aca00',
          paymasterAndData: '0x',
          signature: '0x' + 'ab'.repeat(65),
        }],
      },
    });
    expect(res.statusCode).toBe(200);

    const rows = await auditStore.list(mixedCaseSender.toLowerCase() as `0x${string}`);
    expect(rows.length).toBe(1);
    const row = rows[0]!;
    expect(row.surface).toBe('paymaster');
    expect(row.userAddress).toBe(mixedCaseSender.toLowerCase());
    expect(row.patch.status).toBe('success');
    // Intent encodes method + a *summary* of params, not the full body.
    // The summary is capped at 100 chars so a 200-byte callData never
    // bloats the audit row.
    const intent = JSON.parse(row.intent) as { method: string; params: string };
    expect(intent.method).toBe('pm_getPaymasterData');
    expect(intent.params.length).toBeLessThanOrEqual(100);
    await app.close();
  });

  it('returns 503 when SHERPA_PAYMASTER_RPC is not configured', async () => {
    const fetchMock = vi.fn();
    const app = buildServer({
      config: { ...offlineConfig(), paymasterRpcUrl: undefined },
      paymasterFetch: fetchMock as unknown as typeof globalThis.fetch,
    });
    const res = await app.inject({ method: 'POST', url: '/api/paymaster', payload: stubData() });
    expect(res.statusCode).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
    await app.close();
  });

  it('isolates rate-limit buckets per sender', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { jsonrpc: '2.0', id: 1, result: {} }));
    const senderA = SENDER;
    const senderB = '0xfedcba9876543210fedcba9876543210fedcba98';
    const rateLimiter: PaymasterRateLimiter = createInMemoryPaymasterRateLimiter();
    const app = buildServer({
      config: offlineConfig(),
      paymasterRateLimiter: rateLimiter,
      paymasterFetch: fetchMock as unknown as typeof globalThis.fetch,
    });
    // Exhaust sender A's quota.
    for (let i = 0; i < 3; i++) {
      await app.inject({ method: 'POST', url: '/api/paymaster', payload: stubData(senderA) });
    }
    const denied = await app.inject({
      method: 'POST',
      url: '/api/paymaster',
      payload: stubData(senderA),
    });
    expect(denied.statusCode).toBe(429);
    // Sender B's bucket is independent.
    const okB = await app.inject({
      method: 'POST',
      url: '/api/paymaster',
      payload: stubData(senderB),
    });
    expect(okB.statusCode).toBe(200);
    expect(okB.headers['x-sherpa-paymaster-remaining']).toBe('2 of 3');
    await app.close();
  });
});
