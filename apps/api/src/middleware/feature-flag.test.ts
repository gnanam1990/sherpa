import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { createRequireStage2 } from './feature-flag.js';
import { loadConfig } from '@sherpa/config';

function buildTestApp(stage2Enabled: boolean) {
  const config = { ...loadConfig(), stage2Enabled };
  const app = Fastify({ logger: false });
  const requireStage2 = createRequireStage2(config);

  app.get('/api/swap/quote', { preHandler: requireStage2 }, async (_req, reply) => {
    return reply.send({ ok: true });
  });
  app.post('/api/swap', { preHandler: requireStage2 }, async (_req, reply) => {
    return reply.send({ ok: true });
  });
  app.post('/api/lend', { preHandler: requireStage2 }, async (_req, reply) => {
    return reply.send({ ok: true });
  });
  app.get('/api/lend/apy', { preHandler: requireStage2 }, async (_req, reply) => {
    return reply.send({ ok: true });
  });
  app.post('/api/withdraw', { preHandler: requireStage2 }, async (_req, reply) => {
    return reply.send({ ok: true });
  });
  app.post('/api/borrow', { preHandler: requireStage2 }, async (_req, reply) => {
    return reply.send({ ok: true });
  });
  app.get('/api/borrow/preview', { preHandler: requireStage2 }, async (_req, reply) => {
    return reply.send({ ok: true });
  });
  app.post('/api/repay', { preHandler: requireStage2 }, async (_req, reply) => {
    return reply.send({ ok: true });
  });

  return app;
}

describe('requireStage2 middleware', () => {
  it('returns 503 for POST /api/swap when stage2 disabled', async () => {
    const app = buildTestApp(false);
    const res = await app.inject({ method: 'POST', url: '/api/swap' });
    expect(res.statusCode).toBe(503);
    const body = res.json() as { error: string; details: string };
    expect(body.error).toBe('feature_not_available');
    expect(body.details).toBe('Stage 2 features are disabled in this environment.');
    await app.close();
  });

  it('returns 503 for GET /api/swap/quote when stage2 disabled', async () => {
    const app = buildTestApp(false);
    const res = await app.inject({ method: 'GET', url: '/api/swap/quote' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ error: 'feature_not_available' });
    await app.close();
  });

  it('returns 503 for POST /api/lend when stage2 disabled', async () => {
    const app = buildTestApp(false);
    const res = await app.inject({ method: 'POST', url: '/api/lend' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ error: 'feature_not_available' });
    await app.close();
  });

  it('returns 503 for GET /api/lend/apy when stage2 disabled', async () => {
    const app = buildTestApp(false);
    const res = await app.inject({ method: 'GET', url: '/api/lend/apy' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ error: 'feature_not_available' });
    await app.close();
  });

  it('returns 503 for POST /api/withdraw when stage2 disabled', async () => {
    const app = buildTestApp(false);
    const res = await app.inject({ method: 'POST', url: '/api/withdraw' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ error: 'feature_not_available' });
    await app.close();
  });

  it('returns 503 for POST /api/borrow when stage2 disabled', async () => {
    const app = buildTestApp(false);
    const res = await app.inject({ method: 'POST', url: '/api/borrow' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ error: 'feature_not_available' });
    await app.close();
  });

  it('returns 503 for GET /api/borrow/preview when stage2 disabled', async () => {
    const app = buildTestApp(false);
    const res = await app.inject({ method: 'GET', url: '/api/borrow/preview' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ error: 'feature_not_available' });
    await app.close();
  });

  it('returns 503 for POST /api/repay when stage2 disabled', async () => {
    const app = buildTestApp(false);
    const res = await app.inject({ method: 'POST', url: '/api/repay' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ error: 'feature_not_available' });
    await app.close();
  });

  it('passes through when stage2 enabled', async () => {
    const app = buildTestApp(true);
    const res = await app.inject({ method: 'GET', url: '/api/swap/quote' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true });
    await app.close();
  });

  it('passes through POST /api/swap when stage2 enabled', async () => {
    const app = buildTestApp(true);
    const res = await app.inject({ method: 'POST', url: '/api/swap' });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it('passes through POST /api/lend when stage2 enabled', async () => {
    const app = buildTestApp(true);
    const res = await app.inject({ method: 'POST', url: '/api/lend' });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it('passes through POST /api/borrow when stage2 enabled', async () => {
    const app = buildTestApp(true);
    const res = await app.inject({ method: 'POST', url: '/api/borrow' });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it('passes through POST /api/repay when stage2 enabled', async () => {
    const app = buildTestApp(true);
    const res = await app.inject({ method: 'POST', url: '/api/repay' });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it('passes through POST /api/withdraw when stage2 enabled', async () => {
    const app = buildTestApp(true);
    const res = await app.inject({ method: 'POST', url: '/api/withdraw' });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it('does not model /api/positions as gated middleware surface', async () => {
    const app = buildTestApp(false);
    const res = await app.inject({ method: 'GET', url: '/api/positions/0x036CbD53842c5426634e7929541eC2318f3dCF7e' });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});
