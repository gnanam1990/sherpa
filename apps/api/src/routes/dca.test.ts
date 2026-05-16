import { describe, test, expect } from 'vitest';
import { dcaRoutes } from './dca.js';
import Fastify from 'fastify';
import { InMemoryDCAStore, type DCAStore } from '@sherpa/memory';

async function buildApp(store?: DCAStore) {
  const app = Fastify();
  const s = store ?? new InMemoryDCAStore();
  await dcaRoutes(app, s);
  await app.ready();
  return { app, store: s };
}

const VALID_ADDRESS = '0x1234567890123456789012345678901234567890';

describe('DCA routes', () => {
  describe('POST /api/dca', () => {
    test('creates DCA schedule with valid body', async () => {
      const { app } = await buildApp();
      const resp = await app.inject({
        method: 'POST',
        url: '/api/dca',
        payload: {
          userAddress: VALID_ADDRESS,
          fromAsset: 'USDC',
          toAsset: 'ETH',
          amountPerTick: '100',
          frequency: 'daily',
        },
      });
      expect(resp.statusCode).toBe(201);
      const body = resp.json();
      expect(body.id).toBeDefined();
      expect(body.status).toBe('active');
      expect(body.totalExecutions).toBe(0);
      expect(body.consecutiveFailures).toBe(0);
    });

    test('creates weekly DCA with dayOfWeek', async () => {
      const { app } = await buildApp();
      const resp = await app.inject({
        method: 'POST',
        url: '/api/dca',
        payload: {
          userAddress: VALID_ADDRESS,
          fromAsset: 'USDC',
          toAsset: 'ETH',
          amountPerTick: '100',
          frequency: 'weekly',
          dayOfWeek: 1,
        },
      });
      expect(resp.statusCode).toBe(201);
      expect(resp.json().frequency).toBe('weekly');
    });

    test('creates monthly DCA with dayOfMonth', async () => {
      const { app } = await buildApp();
      const resp = await app.inject({
        method: 'POST',
        url: '/api/dca',
        payload: {
          userAddress: VALID_ADDRESS,
          fromAsset: 'USDC',
          toAsset: 'ETH',
          amountPerTick: '100',
          frequency: 'monthly',
          dayOfMonth: 15,
        },
      });
      expect(resp.statusCode).toBe(201);
    });

    test('creates DCA with endCondition count', async () => {
      const { app } = await buildApp();
      const resp = await app.inject({
        method: 'POST',
        url: '/api/dca',
        payload: {
          userAddress: VALID_ADDRESS,
          fromAsset: 'USDC',
          toAsset: 'ETH',
          amountPerTick: '100',
          frequency: 'daily',
          endCondition: 'count',
          maxExecutions: 30,
        },
      });
      expect(resp.statusCode).toBe(201);
      expect(resp.json().endCondition).toBe('count');
      expect(resp.json().maxExecutions).toBe(30);
    });

    test('rejects invalid userAddress', async () => {
      const { app } = await buildApp();
      const resp = await app.inject({
        method: 'POST',
        url: '/api/dca',
        payload: {
          userAddress: 'invalid',
          fromAsset: 'USDC',
          toAsset: 'ETH',
          amountPerTick: '100',
          frequency: 'daily',
        },
      });
      expect(resp.statusCode).toBe(400);
    });

    test('rejects invalid frequency', async () => {
      const { app } = await buildApp();
      const resp = await app.inject({
        method: 'POST',
        url: '/api/dca',
        payload: {
          userAddress: VALID_ADDRESS,
          fromAsset: 'USDC',
          toAsset: 'ETH',
          amountPerTick: '100',
          frequency: 'hourly',
        },
      });
      expect(resp.statusCode).toBe(400);
    });

    test('rejects zero amount', async () => {
      const { app } = await buildApp();
      const resp = await app.inject({
        method: 'POST',
        url: '/api/dca',
        payload: {
          userAddress: VALID_ADDRESS,
          fromAsset: 'USDC',
          toAsset: 'ETH',
          amountPerTick: '0',
          frequency: 'daily',
        },
      });
      expect(resp.statusCode).toBe(400);
    });

    test('rejects count endCondition without maxExecutions', async () => {
      const { app } = await buildApp();
      const resp = await app.inject({
        method: 'POST',
        url: '/api/dca',
        payload: {
          userAddress: VALID_ADDRESS,
          fromAsset: 'USDC',
          toAsset: 'ETH',
          amountPerTick: '100',
          frequency: 'daily',
          endCondition: 'count',
        },
      });
      expect(resp.statusCode).toBe(400);
    });

    test('accepts biweekly frequency', async () => {
      const { app } = await buildApp();
      const resp = await app.inject({
        method: 'POST',
        url: '/api/dca',
        payload: {
          userAddress: VALID_ADDRESS,
          fromAsset: 'USDC',
          toAsset: 'ETH',
          amountPerTick: '100',
          frequency: 'biweekly',
        },
      });
      expect(resp.statusCode).toBe(201);
      expect(resp.json().frequency).toBe('biweekly');
    });
  });

  describe('GET /api/dca/:address', () => {
    test('returns schedules for valid address', async () => {
      const { app, store } = await buildApp();
      await store.createSchedule({
        userAddress: VALID_ADDRESS,
        fromAsset: { symbol: 'USDC' },
        toAsset: { symbol: 'ETH' },
        amountPerTick: '100',
        frequency: 'daily',
        nextExecutionAt: new Date().toISOString(),
      });

      const resp = await app.inject({
        method: 'GET',
        url: `/api/dca/${VALID_ADDRESS}`,
      });
      expect(resp.statusCode).toBe(200);
      expect(resp.json().schedules.length).toBe(1);
    });

    test('returns empty for user with no schedules', async () => {
      const { app } = await buildApp();
      const resp = await app.inject({
        method: 'GET',
        url: `/api/dca/${VALID_ADDRESS}`,
      });
      expect(resp.statusCode).toBe(200);
      expect(resp.json().schedules).toEqual([]);
    });

    test('rejects invalid address', async () => {
      const { app } = await buildApp();
      const resp = await app.inject({
        method: 'GET',
        url: '/api/dca/invalid',
      });
      expect(resp.statusCode).toBe(400);
    });
  });

  describe('PATCH /api/dca/:id', () => {
    test('pauses schedule', async () => {
      const { app, store } = await buildApp();
      const schedule = await store.createSchedule({
        userAddress: VALID_ADDRESS,
        fromAsset: { symbol: 'USDC' },
        toAsset: { symbol: 'ETH' },
        amountPerTick: '100',
        frequency: 'daily',
        nextExecutionAt: new Date().toISOString(),
      });

      const resp = await app.inject({
        method: 'PATCH',
        url: `/api/dca/${schedule.id}`,
        payload: { status: 'paused' },
      });
      expect(resp.statusCode).toBe(200);
      expect(resp.json().status).toBe('paused');
    });

    test('resumes schedule', async () => {
      const { app, store } = await buildApp();
      const schedule = await store.createSchedule({
        userAddress: VALID_ADDRESS,
        fromAsset: { symbol: 'USDC' },
        toAsset: { symbol: 'ETH' },
        amountPerTick: '100',
        frequency: 'daily',
        nextExecutionAt: new Date().toISOString(),
      });
      await store.pauseSchedule(schedule.id);

      const resp = await app.inject({
        method: 'PATCH',
        url: `/api/dca/${schedule.id}`,
        payload: { status: 'active' },
      });
      expect(resp.statusCode).toBe(200);
      expect(resp.json().status).toBe('active');
    });

    test('cancels schedule', async () => {
      const { app, store } = await buildApp();
      const schedule = await store.createSchedule({
        userAddress: VALID_ADDRESS,
        fromAsset: { symbol: 'USDC' },
        toAsset: { symbol: 'ETH' },
        amountPerTick: '100',
        frequency: 'daily',
        nextExecutionAt: new Date().toISOString(),
      });

      const resp = await app.inject({
        method: 'PATCH',
        url: `/api/dca/${schedule.id}`,
        payload: { status: 'cancelled' },
      });
      expect(resp.statusCode).toBe(200);
      expect(resp.json().status).toBe('completed');
    });

    test('updates amountPerTick', async () => {
      const { app, store } = await buildApp();
      const schedule = await store.createSchedule({
        userAddress: VALID_ADDRESS,
        fromAsset: { symbol: 'USDC' },
        toAsset: { symbol: 'ETH' },
        amountPerTick: '100',
        frequency: 'daily',
        nextExecutionAt: new Date().toISOString(),
      });

      const resp = await app.inject({
        method: 'PATCH',
        url: `/api/dca/${schedule.id}`,
        payload: { amountPerTick: '200' },
      });
      expect(resp.statusCode).toBe(200);
      expect(resp.json().amountPerTick).toBe('200');
    });

    test('rejects invalid body fields', async () => {
      const { app, store } = await buildApp();
      const schedule = await store.createSchedule({
        userAddress: VALID_ADDRESS,
        fromAsset: { symbol: 'USDC' },
        toAsset: { symbol: 'ETH' },
        amountPerTick: '100',
        frequency: 'daily',
        nextExecutionAt: new Date().toISOString(),
      });

      const resp = await app.inject({
        method: 'PATCH',
        url: `/api/dca/${schedule.id}`,
        payload: { invalidField: true },
      });
      expect(resp.statusCode).toBe(400);
    });

    test('returns 404 for non-existent schedule', async () => {
      const { app } = await buildApp();
      const resp = await app.inject({
        method: 'PATCH',
        url: '/api/dca/550e8400-e29b-41d4-a716-446655440000',
        payload: { status: 'paused' },
      });
      expect(resp.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/dca/:id', () => {
    test('deletes schedule', async () => {
      const { app, store } = await buildApp();
      const schedule = await store.createSchedule({
        userAddress: VALID_ADDRESS,
        fromAsset: { symbol: 'USDC' },
        toAsset: { symbol: 'ETH' },
        amountPerTick: '100',
        frequency: 'daily',
        nextExecutionAt: new Date().toISOString(),
      });

      const resp = await app.inject({
        method: 'DELETE',
        url: `/api/dca/${schedule.id}`,
      });
      expect(resp.statusCode).toBe(200);
      expect(resp.json().status).toBe('deleted');
    });

    test('returns 404 for non-existent schedule', async () => {
      const { app } = await buildApp();
      const resp = await app.inject({
        method: 'DELETE',
        url: '/api/dca/550e8400-e29b-41d4-a716-446655440000',
      });
      expect(resp.statusCode).toBe(404);
    });
  });

  describe('GET /api/dca/:id/history', () => {
    test('returns execution history', async () => {
      const { app, store } = await buildApp();
      const schedule = await store.createSchedule({
        userAddress: VALID_ADDRESS,
        fromAsset: { symbol: 'USDC' },
        toAsset: { symbol: 'ETH' },
        amountPerTick: '100',
        frequency: 'daily',
        nextExecutionAt: new Date().toISOString(),
      });
      await store.createExecution({
        dcaScheduleId: schedule.id,
        amountIn: '100',
        status: 'success',
        txHash: '0xabc',
      });

      const resp = await app.inject({
        method: 'GET',
        url: `/api/dca/${schedule.id}/history`,
      });
      expect(resp.statusCode).toBe(200);
      expect(resp.json().executions.length).toBe(1);
    });

    test('returns empty for schedule with no executions', async () => {
      const { app, store } = await buildApp();
      const schedule = await store.createSchedule({
        userAddress: VALID_ADDRESS,
        fromAsset: { symbol: 'USDC' },
        toAsset: { symbol: 'ETH' },
        amountPerTick: '100',
        frequency: 'daily',
        nextExecutionAt: new Date().toISOString(),
      });

      const resp = await app.inject({
        method: 'GET',
        url: `/api/dca/${schedule.id}/history`,
      });
      expect(resp.statusCode).toBe(200);
      expect(resp.json().executions).toEqual([]);
    });

    test('returns 404 for non-existent schedule', async () => {
      const { app } = await buildApp();
      const resp = await app.inject({
        method: 'GET',
        url: '/api/dca/550e8400-e29b-41d4-a716-446655440000/history',
      });
      expect(resp.statusCode).toBe(404);
    });
  });

  describe('GET /api/dca/:id/stats', () => {
    test('returns schedule stats', async () => {
      const { app, store } = await buildApp();
      const schedule = await store.createSchedule({
        userAddress: VALID_ADDRESS,
        fromAsset: { symbol: 'USDC' },
        toAsset: { symbol: 'ETH' },
        amountPerTick: '100',
        frequency: 'daily',
        nextExecutionAt: new Date().toISOString(),
      });

      const resp = await app.inject({
        method: 'GET',
        url: `/api/dca/${schedule.id}/stats`,
      });
      expect(resp.statusCode).toBe(200);
      const stats = resp.json();
      expect(stats.totalExecutions).toBe(0);
      expect(stats.successfulExecutions).toBe(0);
      expect(stats.failedExecutions).toBe(0);
    });

    test('returns 404 for non-existent schedule', async () => {
      const { app } = await buildApp();
      const resp = await app.inject({
        method: 'GET',
        url: '/api/dca/550e8400-e29b-41d4-a716-446655440000/stats',
      });
      expect(resp.statusCode).toBe(404);
    });
  });
});
