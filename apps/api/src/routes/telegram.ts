/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 * Telegram Bot signing endpoints.
 *
 * POST /api/telegram/sign-intent — generates a one-time signing URL that
 *   opens the Sherpa web app for wallet-based transaction signing.
 *
 * POST /api/telegram/tx-confirmed — webhook invoked by the web app after
 *   a transaction is signed and submitted, so the bot can notify the user.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

const SignIntentBody = z.object({
  tgUserId: z.number(),
  intent: z.string(),
  params: z.record(z.string()).optional(),
});

export function registerTelegramRoutes(app: FastifyInstance): void {
  app.post('/api/telegram/sign-intent', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = SignIntentBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request body' });
    }

    const { tgUserId, intent, params } = parsed.data;

    const token = Buffer.from(
      JSON.stringify({
        tgUserId,
        intent,
        params,
        exp: Date.now() + 5 * 60 * 1000,
      }),
    ).toString('base64url');

    const webBase = process.env.SHERPA_WEB_BASE || 'https://sherpa-web.vercel.app';
    const signingUrl = `${webBase}/sign?token=${token}`;

    return reply.send({ signingUrl, expiresIn: 300 });
  });

  app.post('/api/telegram/tx-confirmed', async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ ok: true });
  });
}
