/**
 * Farcaster Mini App webhook and frame metadata endpoints.
 *
 * POST /api/webhooks/farcaster — receives Farcaster webhook events
 * (frame_added, frame_removed, notifications_enabled, etc.). Signature
 * verification is stubbed for now; production will verify using
 * Farcaster's public key.
 *
 * GET /api/farcaster/frame — returns frame metadata for the Farcaster
 * Mini App manifest.
 */

import type { FastifyInstance } from 'fastify';

export function registerFarcasterRoutes(app: FastifyInstance): void {
  app.post('/api/webhooks/farcaster', async (req, reply) => {
    try {
      const body = req.body as Record<string, unknown> | undefined;

      // Verify Farcaster signature (stub for now)
      // In production: verify the request signature using Farcaster's public key

      if (body?.type === 'frame_added') {
        app.log.info({ fid: body.fid }, 'Frame added by user');
        return reply.send({ ok: true });
      }

      if (body?.type === 'frame_removed') {
        app.log.info({ fid: body.fid }, 'Frame removed by user');
        return reply.send({ ok: true });
      }

      if (body?.type === 'notifications_enabled') {
        app.log.info({ fid: body.fid }, 'Notifications enabled');
        return reply.send({ ok: true });
      }

      return reply.send({ ok: true });
    } catch (err) {
      app.log.error(err, 'Farcaster webhook error');
      return reply.status(400).send({ error: 'Invalid webhook' });
    }
  });

  app.get('/api/farcaster/frame', async (_req, reply) => {
    return reply.send({
      name: 'Sherpa',
      iconUrl: 'https://sherpa-web.vercel.app/icon-512.png',
      homeUrl: 'https://sherpa-mini.vercel.app',
      buttonTitle: 'Open Sherpa',
      splashBackgroundColor: '#0052FF',
    });
  });
}
