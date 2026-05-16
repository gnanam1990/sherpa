import { describe, test, expect } from 'vitest';
import Fastify from 'fastify';
import { sessionKeyRoutes } from './session-keys.js';

async function buildApp() {
  const app = Fastify();
  await app.register(sessionKeyRoutes);
  await app.ready();
  return app;
}

describe('Session Key API Routes', () => {
  test('POST /api/session-keys creates a key', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/session-keys',
      payload: {
        ownerAddress: '0x1111111111111111111111111111111111111111',
        chainId: 8453,
        spendLimit: '1000000000',
        validDuration: 86400,
        permissions: [
          { target: '0x2222222222222222222222222222222222222222', selector: '0x12345678', maxValue: '100000000' },
        ],
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.id).toBeDefined();
    expect(body.status).toBe('active');
    expect(body.sessionKeyAddress).toBeDefined();
    await app.close();
  });

  test('POST /api/session-keys rejects invalid ownerAddress', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/session-keys',
      payload: {
        ownerAddress: 'not-an-address',
        chainId: 8453,
        spendLimit: '100',
        validDuration: 86400,
        permissions: [{ target: '0x2222222222222222222222222222222222222222', selector: '0x12345678', maxValue: '100' }],
      },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  test('POST /api/session-keys rejects too-short duration', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/session-keys',
      payload: {
        ownerAddress: '0x1111111111111111111111111111111111111111',
        chainId: 8453,
        spendLimit: '100',
        validDuration: 10,
        permissions: [{ target: '0x2222222222222222222222222222222222222222', selector: '0x12345678', maxValue: '100' }],
      },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  test('POST /api/session-keys accepts optional scope and limits', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/session-keys',
      payload: {
        ownerAddress: '0x1111111111111111111111111111111111111111',
        chainId: 8453,
        spendLimit: '1000000000',
        validDuration: 86400,
        permissions: [
          { target: '0x2222222222222222222222222222222222222222', selector: '0x12345678', maxValue: '100000000' },
        ],
        scope: [{ target: '0x2222222222222222222222222222222222222222', functions: ['0x12345678'] }],
        limits: { perTxValue: '50000000', dailyTotal: '500000000' },
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.limits.perTxValue).toBe('50000000');
    await app.close();
  });

  test('GET /api/session-keys/:address lists keys', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/session-keys/0x1111111111111111111111111111111111111111',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.sessionKeys).toBeDefined();
    expect(Array.isArray(body.sessionKeys)).toBe(true);
    await app.close();
  });

  test('GET /api/session-keys/:address rejects invalid address', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/session-keys/bad',
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  test('PATCH /api/session-keys/:id updates limits', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/session-keys/test-id-123',
      payload: { dailyTotal: '5000' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.limits.dailyTotal).toBe('5000');
    await app.close();
  });

  test('PATCH /api/session-keys/:id rejects invalid id', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/session-keys/!!!',
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  test('PATCH /api/session-keys/:id rejects invalid body', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/session-keys/test-id',
      payload: { unknownField: 'bad' },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  test('DELETE /api/session-keys/:id revokes key', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/session-keys/test-id-123',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('revoked');
    await app.close();
  });

  test('DELETE /api/session-keys/:id rejects invalid id', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/session-keys/!!!',
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  test('GET /api/session-keys/:id/usage returns usage stats', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/session-keys/test-id-123/usage',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.totalTransactions).toBeDefined();
    expect(body.totalGasUsed).toBeDefined();
    expect(body.dailyUsage).toBeDefined();
    await app.close();
  });

  test('GET /api/session-keys/:id/usage rejects invalid id', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/session-keys/!!!/usage',
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  test('POST /api/session-keys with maxExecutions', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/session-keys',
      payload: {
        ownerAddress: '0x1111111111111111111111111111111111111111',
        chainId: 8453,
        spendLimit: '1000000000',
        validDuration: 86400,
        permissions: [
          { target: '0x2222222222222222222222222222222222222222', selector: '0x12345678', maxValue: '100000000' },
        ],
        maxExecutions: 50,
      },
    });
    expect(res.statusCode).toBe(201);
    await app.close();
  });

  test('POST /api/session-keys rejects maxExecutions over limit', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/session-keys',
      payload: {
        ownerAddress: '0x1111111111111111111111111111111111111111',
        chainId: 8453,
        spendLimit: '1000000000',
        validDuration: 86400,
        permissions: [
          { target: '0x2222222222222222222222222222222222222222', selector: '0x12345678', maxValue: '100000000' },
        ],
        maxExecutions: 999999,
      },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  test('POST /api/session-keys rejects empty permissions', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/session-keys',
      payload: {
        ownerAddress: '0x1111111111111111111111111111111111111111',
        chainId: 8453,
        spendLimit: '100',
        validDuration: 86400,
        permissions: [],
      },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});
