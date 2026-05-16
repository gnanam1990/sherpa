import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { verifyMessage } from 'viem/actions';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import {
  linkFarcasterFid,
  getFarcasterLink,
  linkTelegramUser,
  getTelegramLink,
  createSigningToken,
  getSigningToken,
  consumeSigningToken,
} from '@sherpa/memory';
import { getPool } from '@sherpa/config';
import type { SherpaConfig } from '@sherpa/config';

const LinkBody = z.object({
  fid: z.number().int().positive().optional(),
  tgUserId: z.number().int().positive().optional(),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
  message: z.string().min(1),
});

const SignIntentBody = z.object({
  surface: z.enum(['telegram', 'farcaster', 'web']),
  surfaceUserId: z.string().min(1),
  intent: z.record(z.unknown()),
});

const ConsumeBody = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});

export async function surfacesRoutes(app: FastifyInstance, config: SherpaConfig): Promise<void> {
  const requirePool = () => {
    if (!config.useRealDb) {
      throw new Error('surfaces routes require SHERPA_USE_REAL_DB=true');
    }
    return getPool(config);
  };

  app.post('/api/surfaces/farcaster/link', async (req, reply) => {
    const parsed = LinkBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.message });
    }
    const { fid, address, signature, message } = parsed.data;
    if (!fid) {
      return reply.code(400).send({ error: 'fid is required for farcaster link' });
    }

    try {
      const client = createPublicClient({ chain: baseSepolia, transport: http() });
      const valid = await verifyMessage(client, {
        address: address as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });
      if (!valid) {
        return reply.code(401).send({ error: 'invalid signature' });
      }
    } catch {
      return reply.code(401).send({ error: 'signature verification failed' });
    }

    const pool = requirePool();
    await linkFarcasterFid(pool, BigInt(fid), address as `0x${string}`, true);
    return reply.send({ ok: true, fid, address });
  });

  app.get<{ Params: { fid: string } }>('/api/surfaces/farcaster/:fid', async (req, reply) => {
    const fid = Number(req.params.fid);
    if (!Number.isInteger(fid) || fid <= 0) {
      return reply.code(400).send({ error: 'invalid fid' });
    }
    const pool = requirePool();
    const link = await getFarcasterLink(pool, BigInt(fid));
    if (!link) return reply.code(404).send({ error: 'not found' });
    return reply.send(link);
  });

  app.post('/api/surfaces/telegram/link', async (req, reply) => {
    const parsed = LinkBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.message });
    }
    const { tgUserId, address, signature, message } = parsed.data;
    if (!tgUserId) {
      return reply.code(400).send({ error: 'tgUserId is required for telegram link' });
    }

    try {
      const client = createPublicClient({ chain: baseSepolia, transport: http() });
      const valid = await verifyMessage(client, {
        address: address as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });
      if (!valid) {
        return reply.code(401).send({ error: 'invalid signature' });
      }
    } catch {
      return reply.code(401).send({ error: 'signature verification failed' });
    }

    const pool = requirePool();
    await linkTelegramUser(pool, BigInt(tgUserId), address as `0x${string}`, true);
    return reply.send({ ok: true, tgUserId, address });
  });

  app.get<{ Params: { tgUserId: string } }>(
    '/api/surfaces/telegram/:tgUserId',
    async (req, reply) => {
      const tgUserId = Number(req.params.tgUserId);
      if (!Number.isInteger(tgUserId) || tgUserId <= 0) {
        return reply.code(400).send({ error: 'invalid tgUserId' });
      }
      const pool = requirePool();
      const link = await getTelegramLink(pool, BigInt(tgUserId));
      if (!link) return reply.code(404).send({ error: 'not found' });
      return reply.send(link);
    },
  );

  app.post('/api/surfaces/sign-intent', async (req, reply) => {
    const parsed = SignIntentBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.message });
    }
    const { surface, surfaceUserId, intent } = parsed.data;
    const webBase = config.sherpaWebBase ?? 'https://sherpa-web.vercel.app';
    const pool = requirePool();
    const { token, expiresAt } = await createSigningToken(pool, {
      surface,
      surfaceUserId,
      intentPayload: intent,
    });
    return reply.send({
      token,
      signUrl: `${webBase}/sign?token=${token}`,
      expiresAt: expiresAt.toISOString(),
    });
  });

  app.get<{ Params: { token: string } }>('/api/surfaces/sign-token/:token', async (req, reply) => {
    const pool = requirePool();
    const tokenData = await getSigningToken(pool, req.params.token);
    if (!tokenData) return reply.code(404).send({ error: 'token not found' });
    if (tokenData.consumed) return reply.code(410).send({ error: 'token already consumed' });
    if (tokenData.expiresAt < new Date()) return reply.code(410).send({ error: 'token expired' });
    return reply.send(tokenData);
  });

  app.post<{ Params: { token: string } }>(
    '/api/surfaces/sign-intent/:token/consume',
    async (req, reply) => {
      const parsed = ConsumeBody.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.message });
      }
      const pool = requirePool();
      try {
        await consumeSigningToken(pool, req.params.token, parsed.data.txHash);
      } catch (err) {
        return reply.code(404).send({ error: (err as Error).message });
      }
      return reply.send({ ok: true });
    },
  );
}
