import { describe, test, expect } from 'vitest';
import { alertRoutes } from './alerts.js';
import Fastify from 'fastify';

async function buildApp() {
  const app = Fastify();
  await alertRoutes(app);
  await app.ready();
  return app;
}

describe('alertRoutes', () => {
  describe('POST /api/alerts', () => {
    test('creates alert with valid body', async () => {
      const app = await buildApp();
      const resp = await app.inject({
        method: 'POST',
        url: '/api/alerts',
        payload: {
          userAddress: '0x1234567890123456789012345678901234567890',
          conditionType: 'price',
          comparison: '>',
          threshold: 5000,
        },
      });
      expect(resp.statusCode).toBe(201);
      const body = resp.json();
      expect(body.id).toBeDefined();
      expect(body.status).toBe('active');
      expect(body.triggerCount).toBe(0);
    });

    test('rejects invalid userAddress', async () => {
      const app = await buildApp();
      const resp = await app.inject({
        method: 'POST',
        url: '/api/alerts',
        payload: {
          userAddress: 'invalid',
          conditionType: 'price',
          comparison: '>',
          threshold: 5000,
        },
      });
      expect(resp.statusCode).toBe(400);
    });

    test('rejects invalid conditionType', async () => {
      const app = await buildApp();
      const resp = await app.inject({
        method: 'POST',
        url: '/api/alerts',
        payload: {
          userAddress: '0x1234567890123456789012345678901234567890',
          conditionType: 'invalid',
          comparison: '>',
          threshold: 5000,
        },
      });
      expect(resp.statusCode).toBe(400);
    });

    test('rejects invalid comparison', async () => {
      const app = await buildApp();
      const resp = await app.inject({
        method: 'POST',
        url: '/api/alerts',
        payload: {
          userAddress: '0x1234567890123456789012345678901234567890',
          conditionType: 'price',
          comparison: 'invalid',
          threshold: 5000,
        },
      });
      expect(resp.statusCode).toBe(400);
    });

    test('accepts optional params', async () => {
      const app = await buildApp();
      const resp = await app.inject({
        method: 'POST',
        url: '/api/alerts',
        payload: {
          userAddress: '0x1234567890123456789012345678901234567890',
          conditionType: 'price',
          comparison: '>',
          threshold: 5000,
          params: { symbol: 'ETH' },
          oneShot: true,
          cooldownSeconds: 600,
          notificationChannels: ['telegram'],
        },
      });
      expect(resp.statusCode).toBe(201);
      const body = resp.json();
      expect(body.oneShot).toBe(true);
      expect(body.cooldownSeconds).toBe(600);
    });

    test('defaults notificationChannels to push', async () => {
      const app = await buildApp();
      const resp = await app.inject({
        method: 'POST',
        url: '/api/alerts',
        payload: {
          userAddress: '0x1234567890123456789012345678901234567890',
          conditionType: 'price',
          comparison: '>',
          threshold: 5000,
        },
      });
      expect(resp.json().notificationChannels).toEqual(['push']);
    });

    test('accepts all condition types', async () => {
      const app = await buildApp();
      const types = ['price', 'balance', 'health-factor', 'gas', 'apy', 'contract-event'];
      for (const conditionType of types) {
        const resp = await app.inject({
          method: 'POST',
          url: '/api/alerts',
          payload: {
            userAddress: '0x1234567890123456789012345678901234567890',
            conditionType,
            comparison: '>',
            threshold: 1,
          },
        });
        expect(resp.statusCode).toBe(201);
      }
    });
  });

  describe('GET /api/alerts/:userAddress', () => {
    test('returns alerts for valid address', async () => {
      const app = await buildApp();
      const resp = await app.inject({
        method: 'GET',
        url: '/api/alerts/0x1234567890123456789012345678901234567890',
      });
      expect(resp.statusCode).toBe(200);
      expect(resp.json()).toHaveProperty('alerts');
    });

    test('rejects invalid address', async () => {
      const app = await buildApp();
      const resp = await app.inject({
        method: 'GET',
        url: '/api/alerts/invalid',
      });
      expect(resp.statusCode).toBe(400);
    });
  });

  describe('GET /api/alerts/:id/history', () => {
    test('returns evaluation history', async () => {
      const app = await buildApp();
      const resp = await app.inject({
        method: 'GET',
        url: '/api/alerts/test-alert-1/history',
      });
      expect(resp.statusCode).toBe(200);
      expect(resp.json()).toHaveProperty('evaluations');
    });
  });

  describe('PATCH /api/alerts/:id', () => {
    test('updates alert status', async () => {
      const app = await buildApp();
      const resp = await app.inject({
        method: 'PATCH',
        url: '/api/alerts/test-id',
        payload: { status: 'paused' },
      });
      expect(resp.statusCode).toBe(200);
      expect(resp.json().status).toBe('paused');
    });

    test('updates threshold', async () => {
      const app = await buildApp();
      const resp = await app.inject({
        method: 'PATCH',
        url: '/api/alerts/test-id',
        payload: { threshold: 6000 },
      });
      expect(resp.statusCode).toBe(200);
      expect(resp.json().threshold).toBe(6000);
    });

    test('rejects invalid body fields', async () => {
      const app = await buildApp();
      const resp = await app.inject({
        method: 'PATCH',
        url: '/api/alerts/test-id',
        payload: { invalidField: true },
      });
      expect(resp.statusCode).toBe(400);
    });

    test('maps cancelled to completed', async () => {
      const app = await buildApp();
      const resp = await app.inject({
        method: 'PATCH',
        url: '/api/alerts/test-id',
        payload: { status: 'cancelled' },
      });
      expect(resp.json().status).toBe('completed');
    });

    test('accepts comparison update', async () => {
      const app = await buildApp();
      const resp = await app.inject({
        method: 'PATCH',
        url: '/api/alerts/test-id',
        payload: { comparison: '<' },
      });
      expect(resp.statusCode).toBe(200);
      expect(resp.json().comparison).toBe('<');
    });
  });

  describe('DELETE /api/alerts/:id', () => {
    test('deletes alert', async () => {
      const app = await buildApp();
      const resp = await app.inject({
        method: 'DELETE',
        url: '/api/alerts/test-id',
      });
      expect(resp.statusCode).toBe(200);
      expect(resp.json().status).toBe('cancelled');
    });
  });
});
