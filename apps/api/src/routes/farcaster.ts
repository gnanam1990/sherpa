import type { FastifyInstance } from 'fastify';
import {
  deactivateNotificationTokens,
  getActiveNotificationToken,
  saveNotificationToken,
} from '@sherpa/memory';
import { getPool } from '@sherpa/config';
import type { SherpaConfig } from '@sherpa/config';

function decodeBase64Url(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

function hostnameOf(url: string): string | undefined {
  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
}

function normalizeEvent(event: string): string {
  return event.replace(/-/g, '_').replace(/^miniapp_/, 'frame_');
}

export function registerFarcasterRoutes(app: FastifyInstance, config: SherpaConfig): void {
  app.get('/api/farcaster/notifications/:fid/status', async (req, reply) => {
    const params = req.params as { fid?: string };
    if (!params.fid || !/^\d+$/.test(params.fid)) {
      return reply.code(400).send({ error: 'invalid fid' });
    }

    const fid = BigInt(params.fid);
    if (!config.useRealDb) {
      return reply.send({
        active: false,
        fid: params.fid,
        persistence: 'process-memory',
      });
    }

    const token = await getActiveNotificationToken(getPool(config), fid);
    return reply.send({
      active: Boolean(token),
      fid: params.fid,
      client: token?.client,
      urlHost: token ? hostnameOf(token.url) : undefined,
      persistence: 'postgres',
    });
  });

  app.post('/api/webhooks/farcaster', async (req, reply) => {
    try {
      const body = req.body as Record<string, unknown> | undefined;
      if (!body) return reply.code(400).send({ error: 'empty body' });

      let eventBody: Record<string, unknown> = body;
      let event: string | undefined;
      let fid: number | undefined;

      if (body.header && body.payload && body.signature) {
        try {
          const headerJson = decodeBase64Url(body.header as string);
          const header = JSON.parse(headerJson) as Record<string, unknown>;
          const payloadJson = decodeBase64Url(body.payload as string);
          const payload = JSON.parse(payloadJson) as Record<string, unknown>;
          eventBody = payload;
          event = payload.event as string | undefined;
          const headerFid = header.fid;
          if (typeof headerFid === 'number' && Number.isInteger(headerFid)) {
            fid = headerFid;
          }
        } catch {
          return reply.code(400).send({ error: 'invalid payload encoding' });
        }
      } else {
        event = (eventBody.type ?? eventBody.event) as string | undefined;
      }

      const rawFid = eventBody.fid;
      if (!fid && typeof rawFid === 'number' && Number.isInteger(rawFid)) {
        fid = rawFid;
      }

      if (!event) return reply.code(400).send({ error: 'missing event type' });
      event = normalizeEvent(event);

      const pool = config.useRealDb ? getPool(config) : null;

      switch (event) {
        case 'frame_added': {
          const details = eventBody.notificationDetails as
            | { token?: string; url?: string }
            | undefined;
          if (pool && fid && details?.token && details?.url) {
            await saveNotificationToken(pool, BigInt(fid), details.token, details.url, 'farcaster');
          }
          app.log.info({ fid, event }, 'Frame added by user');
          break;
        }
        case 'frame_removed': {
          if (pool && fid) {
            await deactivateNotificationTokens(pool, BigInt(fid));
          }
          app.log.info({ fid, event }, 'Frame removed by user');
          break;
        }
        case 'notifications_enabled': {
          const details = eventBody.notificationDetails as
            | { token?: string; url?: string }
            | undefined;
          if (pool && fid && details?.token && details?.url) {
            await saveNotificationToken(pool, BigInt(fid), details.token, details.url, 'farcaster');
          }
          app.log.info({ fid, event }, 'Notifications enabled');
          break;
        }
        case 'notifications_disabled': {
          if (pool && fid) {
            await deactivateNotificationTokens(pool, BigInt(fid));
          }
          app.log.info({ fid, event }, 'Notifications disabled');
          break;
        }
        default:
          app.log.info({ fid, event }, 'Unknown webhook event');
      }

      return reply.send({ ok: true });
    } catch (err) {
      app.log.error(err, 'Farcaster webhook error');
      return reply.code(400).send({ error: 'Invalid webhook' });
    }
  });

  app.get('/api/farcaster/frame', async (_req, reply) => {
    const URL = process.env.NEXT_PUBLIC_URL || 'https://sherpa-miniapp.vercel.app';
    return reply.send({
      name: 'Sherpa',
      iconUrl: `${URL}/icon-512.png`,
      homeUrl: URL,
      buttonTitle: 'Open Sherpa',
      splashBackgroundColor: '#0052FF',
    });
  });
}
