import { afterEach, describe, test, expect, vi } from 'vitest';
import Fastify from 'fastify';
import { notificationRoutes } from './notifications.js';
import { strategyRoutes } from './strategies.js';
import { developerRoutes } from './developer.js';
import { securityRoutes } from './security.js';
import { composableRoutes } from './composable.js';

// P1-3: Verify routes previously returning stub-* IDs now return 501 not_implemented

describe('Stub ID routes return 501 not fake success (P1-3)', () => {
  const originalTelegramToken = process.env.TELEGRAM_BOT_TOKEN;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalTelegramToken === undefined) {
      delete process.env.TELEGRAM_BOT_TOKEN;
    } else {
      process.env.TELEGRAM_BOT_TOKEN = originalTelegramToken;
    }
  });

  async function makeApp(register: (app: ReturnType<typeof Fastify>) => Promise<void>) {
    const app = Fastify({ logger: false });
    await register(app);
    return app;
  }

  describe('notifications', () => {
    test('POST /api/notifications/subscribe persists a real subscription', async () => {
      const app = await makeApp(notificationRoutes);
      const userAddress = '0x1234567890123456789012345678901234567890';
      const res = await app.inject({
        method: 'POST',
        url: '/api/notifications/subscribe',
        payload: { userAddress, channel: 'telegram', recipient: '6102672721', condition: 'hf < 1.5' },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.subscription.id).toEqual(expect.any(String));
      expect(body.subscription.enabled).toBe(true);
      expect(body.subscription.storage).toBe('memory');

      const list = await app.inject({
        method: 'GET',
        url: `/api/notifications/${userAddress}`,
      });
      expect(list.statusCode).toBe(200);
      expect(JSON.parse(list.body).subscriptions).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: body.subscription.id })]),
      );
    });

    test('POST /api/notifications/send dispatches telegram without fake success', async () => {
      const app = await makeApp(notificationRoutes);
      process.env.TELEGRAM_BOT_TOKEN = 'test-token';
      const fetchMock = vi.fn(async () => new Response(
        JSON.stringify({ ok: true, result: { message_id: 42 } }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ));
      vi.stubGlobal('fetch', fetchMock);

      const res = await app.inject({
        method: 'POST',
        url: '/api/notifications/send',
        payload: {
          userAddress: '0x2234567890123456789012345678901234567890',
          channel: 'telegram',
          recipient: '6102672721',
          title: 'Sherpa smoke test',
          body: 'Notification route dispatches through Telegram.',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.ok).toBe(true);
      expect(body.notification.result.messageId).toBe('42');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.telegram.org/bottest-token/sendMessage',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    test('POST /api/notifications/send dispatches Farcaster through Mini App token URL', async () => {
      const app = await makeApp(async (fastify) =>
        notificationRoutes(fastify, {
          farcasterTokenResolver: async (fid) =>
            fid === 976779
              ? {
                  token: 'fc-token',
                  url: 'https://api.farcaster.xyz/v1/frame-notifications',
                }
              : null,
          farcasterTargetUrl: 'https://sherpa-miniapp.vercel.app',
        }),
      );
      const fetchMock = vi.fn(async () => new Response(
        JSON.stringify({ result: { successfulTokens: ['fc-token'] } }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ));
      vi.stubGlobal('fetch', fetchMock);

      const res = await app.inject({
        method: 'POST',
        url: '/api/notifications/send',
        payload: {
          userAddress: '0x4234567890123456789012345678901234567890',
          channel: 'farcaster',
          recipient: '976779',
          title: 'Sherpa alert',
          body: 'Farcaster notification route uses the Mini App token endpoint.',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).ok).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.farcaster.xyz/v1/frame-notifications',
        expect.objectContaining({ method: 'POST' }),
      );
      const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
      const sent = JSON.parse(String(init.body));
      expect(sent.tokens).toEqual(['fc-token']);
      expect(sent.targetUrl).toBe('https://sherpa-miniapp.vercel.app');
    });

    test('POST /api/notifications/send fails Farcaster explicitly when no Mini App token exists', async () => {
      const app = await makeApp(async (fastify) =>
        notificationRoutes(fastify, {
          farcasterTokenResolver: async () => null,
        }),
      );

      const res = await app.inject({
        method: 'POST',
        url: '/api/notifications/send',
        payload: {
          userAddress: '0x5234567890123456789012345678901234567890',
          channel: 'farcaster',
          recipient: '976779',
          title: 'Sherpa alert',
          body: 'Farcaster should fail until token opt-in is complete.',
        },
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.body);
      expect(body.ok).toBe(false);
      expect(body.error).toBe('missing farcaster notification token');
    });

    test('POST /api/notifications/send returns explicit channel gaps', async () => {
      const app = await makeApp(notificationRoutes);
      const res = await app.inject({
        method: 'POST',
        url: '/api/notifications/send',
        payload: {
          userAddress: '0x3234567890123456789012345678901234567890',
          channel: 'email',
          recipient: 'builder@example.com',
          title: 'Sherpa',
          body: 'Email should fail explicitly until the channel is wired.',
        },
      });
      expect(res.statusCode).toBe(501);
      const body = JSON.parse(res.body);
      expect(body.ok).toBe(false);
      expect(body.error).toBe('email_channel_not_implemented');
      expect(JSON.stringify(body)).not.toContain('stub');
    });
  });

  describe('strategies', () => {
    test('POST /api/strategies creates a real in-memory strategy', async () => {
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
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.strategy.id).toEqual(expect.any(String));
      expect(body.strategy.executionEnabled).toBe(false);
      expect(JSON.stringify(body)).not.toContain('stub');

      const lookup = await app.inject({ method: 'GET', url: `/api/strategies/${body.strategy.id}` });
      expect(lookup.statusCode).toBe(200);
      expect(JSON.parse(lookup.body).strategy.name).toBe('Test Strategy');
    });

    test('POST /api/strategies/:id/follow records follows without fake IDs', async () => {
      const app = await makeApp(strategyRoutes);
      const res = await app.inject({
        method: 'POST',
        url: '/api/strategies/dca-eth-weekly/follow',
        payload: { userAddress: '0x1234567890123456789012345678901234567890' },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.following).toBe(true);
      expect(body.strategy.id).toBe('dca-eth-weekly');
      expect(JSON.stringify(body)).not.toContain('stub');
    });

    test('POST /api/strategies/:id/run is explicitly disabled, not fake success', async () => {
      const app = await makeApp(strategyRoutes);
      const res = await app.inject({
        method: 'POST',
        url: '/api/strategies/dca-eth-weekly/run',
        payload: { userAddress: '0x1234567890123456789012345678901234567890', parameters: {} },
      });
      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('execution_disabled');
      expect(JSON.stringify(body)).not.toContain('stub');
    });
  });

  describe('developer', () => {
    test('POST /api/developer/keys creates a real one-time API key', async () => {
      const app = await makeApp(developerRoutes);
      const res = await app.inject({
        method: 'POST',
        url: '/api/developer/keys',
        payload: { name: 'My Key' },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.key).toMatch(/^sk_/);
      expect(body.apiKey.id).toEqual(expect.any(String));
      expect(body.apiKey.keyPreview).toContain('...');
      expect(body.apiKey).not.toHaveProperty('keyHash');
      expect(JSON.stringify(body)).not.toContain('stub');

      const list = await app.inject({ method: 'GET', url: '/api/developer/keys' });
      expect(list.statusCode).toBe(200);
      expect(JSON.parse(list.body).keys).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: body.apiKey.id })]),
      );
    });

    test('POST /api/developer/webhooks creates a real webhook registration', async () => {
      const app = await makeApp(developerRoutes);
      const res = await app.inject({
        method: 'POST',
        url: '/api/developer/webhooks',
        payload: { url: 'https://example.com/hook', events: ['swap.executed'] },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.secret).toMatch(/^whsec_/);
      expect(body.webhook.id).toEqual(expect.any(String));
      expect(body.webhook.status).toBe('active');
      expect(body.webhook).not.toHaveProperty('secretHash');
      expect(JSON.stringify(body)).not.toContain('stub');

      const list = await app.inject({ method: 'GET', url: '/api/developer/webhooks' });
      expect(list.statusCode).toBe(200);
      expect(JSON.parse(list.body).webhooks).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: body.webhook.id })]),
      );
    });
  });

  describe('security', () => {
    test('POST /api/security/multisig registers external Safe configs without fake deploys', async () => {
      const app = await makeApp(securityRoutes);
      const safeAddress = '0x53918b7635d2d2c2882b213E3321c03887C98D73';
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
          safeAddress,
        },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.multisig.safeAddress).toBe(safeAddress.toLowerCase());
      expect(body.multisig.deploymentStatus).toBe('external_safe');
      expect(body.warning).toContain('did not deploy');
      expect(JSON.stringify(body)).not.toContain('stub');

      const lookup = await app.inject({ method: 'GET', url: `/api/security/multisig/${safeAddress}` });
      expect(lookup.statusCode).toBe(200);
      expect(JSON.parse(lookup.body).configured).toBe(true);
    });
  });

  describe('composable', () => {
    test('POST /api/composable/flash-loan returns a preview with execution disabled', async () => {
      const app = await makeApp(composableRoutes);
      const res = await app.inject({
        method: 'POST',
        url: '/api/composable/flash-loan',
        payload: { asset: 'USDC', amount: '1000000', chainId: 8453 },
      });
      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('execution_disabled');
      expect(body.preview.asset).toBe('USDC');
      expect(body.preview.estimatedFeeBaseUnits).toBe('900');
      expect(JSON.stringify(body)).not.toContain('stub');
    });

    test('POST /api/composable/leverage returns a risk preview with execution disabled', async () => {
      const app = await makeApp(composableRoutes);
      const res = await app.inject({
        method: 'POST',
        url: '/api/composable/leverage',
        payload: { asset: 'ETH', leverageRatio: 2, collateralAsset: 'USDC', collateralAmount: '1000000', chainId: 8453 },
      });
      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('execution_disabled');
      expect(body.preview.riskLevel).toBe('low');
      expect(body.preview.borrowAmountBaseUnits).toBe('1000000');
      expect(JSON.stringify(body)).not.toContain('stub');
    });
  });
});
