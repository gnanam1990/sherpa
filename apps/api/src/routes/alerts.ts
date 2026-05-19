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
import {
  InMemoryAlertStore,
  type AlertRow,
  type AlertStore,
} from '@sherpa/memory';
import { z } from 'zod';

const CreateAlertBody = z.object({
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  conditionType: z.enum([
    'price',
    'balance',
    'health-factor',
    'gas',
    'apy',
    'contract-event',
  ]),
  asset: z.string().optional(),
  comparison: z.enum(['>', '<', '>=', '<=', '==', 'cross-above', 'cross-below']),
  threshold: z.number(),
      notificationChannels: z
    .array(z.enum(['email', 'push', 'web-push', 'farcaster', 'telegram']))
    .default(['push']),
  triggeredIntent: z.string().optional(),
  params: z.record(z.unknown()).optional(),
  oneShot: z.boolean().default(false),
  cooldownSeconds: z.number().int().min(60).max(86400).default(3600),
});

const AddressParams = z.object({
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

const IdParams = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
});

const UpdateAlertBody = z
  .object({
    status: z.enum(['active', 'paused', 'cancelled']).optional(),
    threshold: z.number().optional(),
    comparison: z.enum(['>', '<', '>=', '<=', '==', 'cross-above', 'cross-below']).optional(),
    notificationChannels: z.array(z.enum(['email', 'push', 'web-push', 'farcaster', 'telegram'])).optional(),
    oneShot: z.boolean().optional(),
    cooldownSeconds: z.number().int().min(60).max(86400).optional(),
  })
  .strict();

const defaultStore: AlertStore = new InMemoryAlertStore();
type PersistenceMode = 'process-memory' | 'postgres';

function serializeAlert(alert: AlertRow) {
  return {
    id: alert.id,
    userAddress: alert.user_address,
    conditionType: alert.condition_type,
    asset: alert.asset,
    comparison: alert.comparison,
    threshold: Number(alert.threshold),
    thresholdAsset: alert.threshold_asset,
    notificationChannels: alert.notification_channels,
    triggeredIntent: alert.triggered_intent,
    status: alert.status,
    createdAt: alert.created_at,
    lastEvaluatedAt: alert.last_evaluated_at,
    triggeredAt: alert.triggered_at,
    triggerCount: alert.trigger_count,
    lastValue: alert.last_value,
    params: alert.params,
    oneShot: alert.one_shot,
    cooldownSeconds: alert.cooldown_seconds,
    lastTriggeredAt: alert.last_triggered_at,
  };
}

export async function alertRoutes(
  app: FastifyInstance,
  maybeStore: AlertStore = defaultStore,
  persistence: PersistenceMode = 'process-memory',
): Promise<void> {
  const store = 'create' in maybeStore ? maybeStore : defaultStore;

  app.post('/api/alerts', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = CreateAlertBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }
    const alert = await store.create({
      userAddress: parsed.data.userAddress,
      conditionType: parsed.data.conditionType,
      asset: parsed.data.asset ? { symbol: parsed.data.asset.toUpperCase() } : undefined,
      comparison: parsed.data.comparison,
      threshold: parsed.data.threshold,
      notificationChannels: parsed.data.notificationChannels,
      triggeredIntent: parsed.data.triggeredIntent,
      params: parsed.data.params,
      oneShot: parsed.data.oneShot,
      cooldownSeconds: parsed.data.cooldownSeconds,
    });
    return reply.status(201).send(serializeAlert(alert));
  });

  app.get('/api/alerts/:userAddress', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = AddressParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid userAddress' });
    }
    const alerts = await store.getByUser(params.data.userAddress);
    return reply.send({
      alerts: alerts.map(serializeAlert),
      userAddress: params.data.userAddress,
      persistence,
    });
  });

  app.get('/api/alerts/:id/history', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = IdParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid id' });
    }
    const alert = await store.getById(params.data.id);
    if (!alert) {
      return reply.status(404).send({ error: 'Alert not found' });
    }
    const evaluations = await store.getEvaluationHistory(params.data.id);
    return reply.send({ evaluations, alertId: params.data.id });
  });

  app.patch('/api/alerts/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = IdParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid id' });
    }
    const body = UpdateAlertBody.safeParse(req.body ?? {});
    if (!body.success) {
      return reply.status(400).send({ error: 'invalid body' });
    }
    const alert = await store.update(params.data.id, {
      status: body.data.status === 'cancelled' ? 'completed' : body.data.status,
      threshold: body.data.threshold,
      comparison: body.data.comparison,
      notificationChannels: body.data.notificationChannels,
      oneShot: body.data.oneShot,
      cooldownSeconds: body.data.cooldownSeconds,
    });
    if (!alert) {
      return reply.status(404).send({ error: 'Alert not found' });
    }
    return reply.send(serializeAlert(alert));
  });

  app.delete('/api/alerts/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = IdParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid id' });
    }
    const deleted = await store.delete(params.data.id);
    if (!deleted) {
      return reply.status(404).send({ error: 'Alert not found' });
    }
    return reply.send({ id: params.data.id, status: 'cancelled' });
  });
}
