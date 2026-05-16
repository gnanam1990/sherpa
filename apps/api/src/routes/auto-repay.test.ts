import { describe, test, expect } from 'vitest';
import Fastify from 'fastify';
import { autoRepayRoutes } from './auto-repay.js';

async function buildApp() {
  const app = Fastify();
  await app.register(autoRepayRoutes);
  await app.ready();
  return app;
}

describe('auto-repay routes', () => {
  describe('POST /api/auto-repay', () => {
    test('creates rule with valid body', async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: 'POST',
        url: '/api/auto-repay',
        payload: {
          userAddress: '0x1234567890123456789012345678901234567890',
          triggerHF: 1.3,
          targetHF: 1.5,
          maxRepayPerExecution: '1000000',
        },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.id).toBeDefined();
      expect(body.status).toBe('active');
    });

    test('rejects invalid address', async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: 'POST',
        url: '/api/auto-repay',
        payload: {
          userAddress: 'invalid',
          triggerHF: 1.3,
          targetHF: 1.5,
          maxRepayPerExecution: '1000',
        },
      });
      expect(res.statusCode).toBe(400);
    });

    test('rejects when targetHF <= triggerHF', async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: 'POST',
        url: '/api/auto-repay',
        payload: {
          userAddress: '0x1234567890123456789012345678901234567890',
          triggerHF: 1.5,
          targetHF: 1.3,
          maxRepayPerExecution: '1000',
        },
      });
      expect(res.statusCode).toBe(400);
    });

    test('accepts custom repaySource', async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: 'POST',
        url: '/api/auto-repay',
        payload: {
          userAddress: '0x1234567890123456789012345678901234567890',
          triggerHF: 1.3,
          targetHF: 1.5,
          maxRepayPerExecution: '1000',
          repaySource: ['dai'],
        },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.repaySource).toEqual(['dai']);
    });

    test('accepts maxPerDay', async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: 'POST',
        url: '/api/auto-repay',
        payload: {
          userAddress: '0x1234567890123456789012345678901234567890',
          triggerHF: 1.3,
          targetHF: 1.5,
          maxRepayPerExecution: '1000',
          maxPerDay: 3,
        },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.maxPerDay).toBe(3);
    });

    test('defaults maxPerDay to 5', async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: 'POST',
        url: '/api/auto-repay',
        payload: {
          userAddress: '0x1234567890123456789012345678901234567890',
          triggerHF: 1.3,
          targetHF: 1.5,
          maxRepayPerExecution: '1000',
        },
      });
      const body = JSON.parse(res.payload);
      expect(body.maxPerDay).toBe(5);
    });

    test('rejects triggerHF out of range', async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: 'POST',
        url: '/api/auto-repay',
        payload: {
          userAddress: '0x1234567890123456789012345678901234567890',
          triggerHF: 0.5,
          targetHF: 1.5,
          maxRepayPerExecution: '1000',
        },
      });
      expect(res.statusCode).toBe(400);
    });

    test('rejects missing body', async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: 'POST',
        url: '/api/auto-repay',
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/auto-repay/:userAddress', () => {
    test('returns rules for valid address', async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: 'GET',
        url: '/api/auto-repay/0x1234567890123456789012345678901234567890',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.rules).toBeDefined();
    });

    test('rejects invalid address', async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: 'GET',
        url: '/api/auto-repay/invalid',
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('PATCH /api/auto-repay/:id', () => {
    test('updates rule', async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/auto-repay/550e8400-e29b-41d4-a716-446655440000',
        payload: { status: 'paused' },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.status).toBe('paused');
    });

    test('rejects invalid id', async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/auto-repay/not-a-uuid!',
        payload: { status: 'paused' },
      });
      expect(res.statusCode).toBe(400);
    });

    test('rejects invalid body fields', async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/auto-repay/550e8400-e29b-41d4-a716-446655440000',
        payload: { unknownField: 'bad' },
      });
      expect(res.statusCode).toBe(400);
    });

    test('accepts empty body', async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/auto-repay/550e8400-e29b-41d4-a716-446655440000',
        payload: {},
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('DELETE /api/auto-repay/:id', () => {
    test('disables rule', async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/auto-repay/550e8400-e29b-41d4-a716-446655440000',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.status).toBe('disabled');
    });

    test('rejects invalid id', async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/auto-repay/not-valid!',
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/auto-repay/:id/history', () => {
    test('returns execution history', async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: 'GET',
        url: '/api/auto-repay/550e8400-e29b-41d4-a716-446655440000/history',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.executions).toBeDefined();
    });

    test('rejects invalid id', async () => {
      const app = await buildApp();
      const res = await app.inject({
        method: 'GET',
        url: '/api/auto-repay/not-valid!/history',
      });
      expect(res.statusCode).toBe(400);
    });
  });
});
