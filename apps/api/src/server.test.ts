import { describe, it, expect } from 'vitest';
import { buildServer } from './server.js';

const USDC_RECIPIENT = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

describe('apps/api', () => {
  it('GET /api/health returns ok:true', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
    await app.close();
  });

  it('POST /api/parse returns a confirmation card for SEND', async () => {
    const app = buildServer();
    const res = await app.inject({
      method: 'POST',
      url: '/api/parse',
      payload: { input: `send 5 usdc to ${USDC_RECIPIENT}`, userKey: 'test' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { card?: { intent: string; steps: unknown[] } };
    expect(body.card?.intent).toBe('SEND');
    expect(body.card?.steps.length).toBe(1);
    await app.close();
  });

  it('POST /api/execute writes an audit log and returns the plan', async () => {
    const app = buildServer();
    const res = await app.inject({
      method: 'POST',
      url: '/api/execute',
      payload: {
        input: `send 1 usdc to ${USDC_RECIPIENT}`,
        userAddress: USDC_RECIPIENT,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { ok: boolean; auditLogId: number; planHash: string };
    expect(body.ok).toBe(true);
    expect(body.auditLogId).toBeGreaterThan(0);
    expect(body.planHash).toMatch(/^0x[a-f0-9]{64}$/);
    await app.close();
  });

  it('POST /api/parse rejects empty input with 400', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'POST', url: '/api/parse', payload: { input: '' } });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('GET /api/balance/:addr resolves direct 0x addresses', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'GET', url: `/api/balance/${USDC_RECIPIENT}` });
    expect(res.statusCode).toBe(200);
    await app.close();
  });
});
