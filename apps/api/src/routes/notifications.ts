/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { InMemoryNotificationStore, type NotificationStore } from '@sherpa/memory';
import {
  dispatchNotification,
  type NotificationDeps,
  type NotificationPayload,
  type NotificationResult,
} from '@sherpa/tools';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const AddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
const ChannelSchema = z.enum(['push', 'web-push', 'email', 'farcaster', 'telegram']);

const SubscribeBody = z.object({
  userAddress: AddressSchema,
  channel: ChannelSchema,
  recipient: z.string().min(1).max(500),
  condition: z.string().max(500).optional(),
  label: z.string().max(120).optional(),
});

const SendBody = z.object({
  userAddress: AddressSchema,
  channel: ChannelSchema,
  recipient: z.string().min(1).max(500),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(2000),
  data: z.record(z.string()).optional(),
  imageUrl: z.string().url().optional(),
});

const UserAddressParams = z.object({ userAddress: AddressSchema });
const SubscriptionParams = z.object({ id: z.string().min(1).max(120) });

type NotificationChannel = z.infer<typeof ChannelSchema>;

function validateRecipient(channel: NotificationChannel, recipient: string): string | null {
  if (channel === 'telegram' && !/^-?\d+$/.test(recipient)) {
    return 'telegram recipient must be a numeric chat id';
  }
  if (channel === 'farcaster' && !/^\d+$/.test(recipient)) {
    return 'farcaster recipient must be a numeric FID';
  }
  if (channel === 'email') {
    const parsed = z.string().email().safeParse(recipient);
    return parsed.success ? null : 'email recipient must be a valid email address';
  }
  if (channel === 'push' || channel === 'web-push') {
    try {
      const parsed = JSON.parse(recipient) as unknown;
      const subscription = z.object({
        endpoint: z.string().url(),
        keys: z.object({
          p256dh: z.string().min(1),
          auth: z.string().min(1),
        }),
      }).safeParse(parsed);
      return subscription.success ? null : 'push recipient must be a JSON PushSubscription';
    } catch {
      return 'push recipient must be valid JSON';
    }
  }
  return null;
}

function statusForDispatchError(error?: string): number {
  if (!error) return 502;
  if (error.endsWith('_not_implemented')) return 501;
  if (error.includes('not configured') || error.endsWith('_not_configured')) return 503;
  if (error.includes('missing farcaster notification token')) return 503;
  return 502;
}

type FarcasterNotificationToken = {
  token: string;
  url: string;
};

type FarcasterTokenResolver = (fid: number) => Promise<FarcasterNotificationToken | null>;
type NotificationDispatcher = (
  channel: string,
  recipient: string,
  payload: NotificationPayload,
  deps: NotificationDeps,
) => Promise<NotificationResult>;

export type NotificationRoutesOptions = {
  store?: NotificationStore;
  dispatcher?: NotificationDispatcher;
  farcasterTokenResolver?: FarcasterTokenResolver;
  farcasterTargetUrl?: string;
};

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 3))}...`;
}

async function dispatchFarcasterMiniAppNotification(
  fid: number,
  payload: NotificationPayload,
  resolver: FarcasterTokenResolver,
  targetUrl = process.env.FARCASTER_NOTIFICATION_TARGET_URL ?? 'https://sherpa-miniapp.vercel.app',
) {
  const token = await resolver(fid);
  if (!token) {
    return { success: false, error: 'missing farcaster notification token' };
  }

  let resp: Response;
  try {
    resp = await fetch(token.url, {
      body: JSON.stringify({
        notificationId: randomUUID(),
        title: truncate(payload.title, 32),
        body: truncate(payload.body, 128),
        targetUrl,
        tokens: [token.token],
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    return {
      success: false,
      error: `farcaster_fetch_error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (!resp.ok) {
    return { success: false, error: `farcaster ${resp.status}` };
  }

  const data = (await resp.json().catch(() => null)) as
    | {
        result?: {
          successfulTokens?: string[];
          invalidTokens?: string[];
          rateLimitedTokens?: string[];
        };
      }
    | null;
  if (data?.result?.successfulTokens && data.result.successfulTokens.length === 0) {
    const invalid = data.result.invalidTokens?.length ?? 0;
    const rateLimited = data.result.rateLimitedTokens?.length ?? 0;
    return {
      success: false,
      error: `farcaster undelivered invalid=${invalid} rateLimited=${rateLimited}`,
    };
  }

  return { success: true };
}

export async function notificationRoutes(
  app: FastifyInstance,
  options: NotificationRoutesOptions = {},
): Promise<void> {
  const notificationStore = options.store ?? new InMemoryNotificationStore();
  const dispatcher = options.dispatcher ?? dispatchNotification;

  app.post('/api/notifications/subscribe', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = SubscribeBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }

    const recipientError = validateRecipient(parsed.data.channel, parsed.data.recipient);
    if (recipientError) {
      return reply.status(400).send({ error: recipientError });
    }

    const subscription = await notificationStore.subscribe({
      ...parsed.data,
      userAddress: parsed.data.userAddress.toLowerCase(),
      enabled: true,
    });

    return reply.code(201).send({ subscription });
  });

  app.get('/api/notifications/:userAddress', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = UserAddressParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: params.error.message });
    }

    const userAddress = params.data.userAddress.toLowerCase();
    const [subscriptions, recentNotifications] = await Promise.all([
      notificationStore.getByUser(userAddress),
      notificationStore.getRecentNotifications(userAddress, 10),
    ]);

    return reply.send({
      subscriptions: subscriptions.filter((subscription) => subscription.enabled !== false),
      recentNotifications,
    });
  });

  app.post('/api/notifications/send', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = SendBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }

    const recipientError = validateRecipient(parsed.data.channel, parsed.data.recipient);
    if (recipientError) {
      return reply.status(400).send({ error: recipientError });
    }

    const payload: NotificationPayload = {
      title: parsed.data.title,
      body: parsed.data.body,
      ...(parsed.data.data ? { data: parsed.data.data } : {}),
      ...(parsed.data.imageUrl ? { imageUrl: parsed.data.imageUrl } : {}),
    };

    try {
      const result =
        parsed.data.channel === 'farcaster' && options.farcasterTokenResolver
          ? await dispatchFarcasterMiniAppNotification(
              Number(parsed.data.recipient),
              payload,
              options.farcasterTokenResolver,
              options.farcasterTargetUrl,
            )
          : await dispatcher(
              parsed.data.channel,
              parsed.data.recipient,
              payload,
              { config: {} },
            );
      const notification = await notificationStore.logNotification({
        userAddress: parsed.data.userAddress.toLowerCase(),
        channel: parsed.data.channel,
        recipient: parsed.data.recipient,
        payload,
        result,
        status: result.success ? 'sent' : 'failed',
        createdAt: Date.now(),
        sentAt: new Date().toISOString(),
      });

      if (!result.success) {
        return reply
          .status(statusForDispatchError(result.error))
          .send({ ok: false, error: result.error, notification });
      }

      return reply.send({ ok: true, notification });
    } catch (err) {
      req.log.error({ err }, 'notification dispatch failed');
      const message = err instanceof Error ? err.message : 'unknown notification error';
      return reply.status(500).send({ ok: false, error: message });
    }
  });

  app.post('/api/notifications/:id/unsubscribe', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = SubscriptionParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: params.error.message });
    }
    const { id } = params.data;
    await notificationStore.unsubscribe(id);
    return reply.send({ id, enabled: false });
  });
}
