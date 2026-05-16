import { describe, test, expect } from 'vitest';
import Fastify from 'fastify';
import { notificationRoutes } from './notifications.js';
import { strategyRoutes } from './strategies.js';
import { developerRoutes } from './developer.js';
import { securityRoutes } from './security.js';
import { composableRoutes } from './composable.js';

// P1-3: Verify routes previously returning stub-* IDs now return 501 not_implemented

describe('Stub ID routes return 501 not fake success (P1-3)', () => {
  async function makeApp(register: (app: ReturnType<typeof Fastify>) => Promise<void>) {
    const app = Fastify({ logger: false });
    await register(app);
    return app;
  }

  describe('notifications', () => {
    test('POST /api/notifications/subscribe returns 501 not_implemented', async () => {
      const app = await makeApp(notificationRoutes);
      const res = await app.inject({
        method: 'POST',
        url: '/api/notifications/subscribe',
        payload: { userAddress: '0x1234567890123456789012345678901234567890', channel: 'telegram' },
      });
      expect(res.statusCode).toBe(501);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('not_implemented');
      expect(body).not.toHaveProperty('id');
    });

    test('POST /api/notifications/send returns 501 not_implemented', async () => {
      const app = await makeApp(notificationRoutes);
      const res = await app.inject({ method: 'POST', url: '/api/notifications/send', payload: {} });
      expect(res.statusCode).toBe(501);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('not_implemented');
      expect(body.details).not.toContain('stub');
    });
  });

  describe('strategies', () => {
    test('POST /api/strategies returns 501 not stub-strategy-id', async () => {
      const app = await makeApp(strategyRoutes);
      const res = await app.inject({
        method: 'POST',
        url: '/api/strategies',
        payload: {
          name: 'Test Strategy',
          creatorAddress: '0x1234567890123456789012345678901234567890',
          chainId: 8453,
          intents: [{ type: 'swap', template: 'swap-usdc-eth' }],
        },
      });
      expect(res.statusCode).toBe(501);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('not_implemented');
      expect(JSON.stringify(body)).not.toContain('stub');
    });

    test('POST /api/strategies/:id/run returns 501 not stub-exec-id', async () => {
      const app = await makeApp(strategyRoutes);
      const res = await app.inject({ method: 'POST', url: '/api/strategies/some-id/run', payload: {} });
      expect(res.statusCode).toBe(501);
      expect(JSON.stringify(JSON.parse(res.body))).not.toContain('stub');
    });
  });

  describe('developer', () => {
    test('POST /api/developer/keys returns 501 not stub-key-id', async () => {
      const app = await makeApp(developerRoutes);
      const res = await app.inject({
        method: 'POST',
        url: '/api/developer/keys',
        payload: { name: 'My Key' },
      });
      expect(res.statusCode).toBe(501);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('not_implemented');
      expect(JSON.stringify(body)).not.toContain('stub');
    });

    test('POST /api/developer/webhooks returns 501 not stub-webhook-id', async () => {
      const app = await makeApp(developerRoutes);
      const res = await app.inject({
        method: 'POST',
        url: '/api/developer/webhooks',
        payload: { url: 'https://example.com/hook', events: ['swap.executed'] },
      });
      expect(res.statusCode).toBe(501);
      expect(JSON.stringify(JSON.parse(res.body))).not.toContain('stub');
    });
  });

  describe('security', () => {
    test('POST /api/security/multisig returns 501 not stub-multisig-id', async () => {
      const app = await makeApp(securityRoutes);
      const res = await app.inject({
        method: 'POST',
        url: '/api/security/multisig',
        payload: {
          threshold: 2,
          signers: [
            '0x1234567890123456789012345678901234567890',
            '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          ],
          chainId: 8453,
        },
      });
      expect(res.statusCode).toBe(501);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('not_implemented');
      expect(JSON.stringify(body)).not.toContain('stub');
    });
  });

  describe('composable', () => {
    test('POST /api/composable/flash-loan returns 501 not stub-flash-loan-id', async () => {
      const app = await makeApp(composableRoutes);
      const res = await app.inject({
        method: 'POST',
        url: '/api/composable/flash-loan',
        payload: { asset: 'USDC', amount: '1000', chainId: 8453 },
      });
      expect(res.statusCode).toBe(501);
      expect(JSON.stringify(JSON.parse(res.body))).not.toContain('stub');
    });

    test('POST /api/composable/leverage returns 501 not stub-leverage-id', async () => {
      const app = await makeApp(composableRoutes);
      const res = await app.inject({
        method: 'POST',
        url: '/api/composable/leverage',
        payload: { asset: 'ETH', leverageRatio: 2, collateralAsset: 'USDC', chainId: 8453 },
      });
      expect(res.statusCode).toBe(501);
      expect(JSON.stringify(JSON.parse(res.body))).not.toContain('stub');
    });
  });
});
