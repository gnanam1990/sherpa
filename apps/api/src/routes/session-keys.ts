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
  InMemorySessionKeyStore,
  type SessionKeyRecord,
  type SessionKeyStore,
} from '@sherpa/memory';
import { validateSessionKeyConfig } from '@sherpa/tools';
import { z } from 'zod';

const CreateSessionKeyBody = z.object({
  ownerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  sessionKeyAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chainId: z.number(),
  spendLimit: z.string().regex(/^\d+$/),
  validDuration: z
    .number()
    .min(60)
    .max(30 * 24 * 60 * 60),
  permissions: z.array(
    z.object({
      target: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
      selector: z.string().regex(/^0x[a-fA-F0-9]{8}$/),
      maxValue: z.string().regex(/^\d+$/),
    }),
  ).min(1),
  scope: z
    .array(
      z.object({
        target: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
        functions: z.array(z.string()),
        maxValuePerTx: z.string().optional(),
      }),
    )
    .optional(),
  limits: z
    .object({
      perTxValue: z.string().optional(),
      dailyTotal: z.string().optional(),
      totalLimit: z.string().optional(),
      maxExecutionsPerDay: z.number().optional(),
    })
    .optional(),
  maxExecutions: z.number().min(1).max(100000).optional(),
});

const AddressParams = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

const IdParams = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
});

const UpdateLimitsBody = z.object({
  perTxValue: z.string().regex(/^\d+$/).optional(),
  dailyTotal: z.string().regex(/^\d+$/).optional(),
  totalLimit: z.string().regex(/^\d+$/).optional(),
  maxExecutionsPerDay: z.number().optional(),
  spendLimit: z.string().regex(/^\d+$/).optional(),
}).strict();

export type SessionKeyRoutesOptions = {
  store?: SessionKeyStore;
};

const defaultStore = new InMemorySessionKeyStore();

function serializeSessionKey(record: SessionKeyRecord) {
  return {
    id: record.id,
    ownerAddress: record.owner_address,
    sessionKeyAddress: record.session_key_address,
    chainId: record.chain_id,
    permissions: record.permissions,
    scope: record.scope,
    limits: record.limits,
    spendLimit: record.spend_limit.toString(),
    spentAmount: record.spent_amount.toString(),
    validFrom: record.valid_from,
    validUntil: record.valid_until,
    maxExecutions: record.max_executions,
    executionCount: record.execution_count,
    status: record.status,
    createdAt: record.created_at,
  };
}

function normalizePermission(permission: z.infer<typeof CreateSessionKeyBody>['permissions'][number]) {
  return {
    target: permission.target.toLowerCase(),
    selector: permission.selector.toLowerCase(),
    maxValue: permission.maxValue,
  };
}

export async function sessionKeyRoutes(
  app: FastifyInstance,
  options: SessionKeyRoutesOptions = {},
): Promise<void> {
  const store = options.store ?? defaultStore;

  app.post('/api/session-keys', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = CreateSessionKeyBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message });
    }

    const configErrors = validateSessionKeyConfig({
      owner: parsed.data.ownerAddress as `0x${string}`,
      chainId: parsed.data.chainId,
      spendLimit: BigInt(parsed.data.spendLimit),
      validDuration: parsed.data.validDuration,
      permissions: parsed.data.permissions.map((permission) => ({
        target: permission.target as `0x${string}`,
        selector: permission.selector as `0x${string}`,
        maxValue: BigInt(permission.maxValue),
      })),
    });
    if (configErrors.length > 0) {
      return reply.status(400).send({ error: configErrors.join('; ') });
    }

    const validFrom = new Date();
    const validUntil = new Date(Date.now() + parsed.data.validDuration * 1000);
    const permissions = parsed.data.permissions.map(normalizePermission);
    const scope = parsed.data.scope ?? permissions.map((p) => ({
      target: p.target,
      functions: [p.selector],
      maxValuePerTx: p.maxValue,
    }));

    const record = await store.create({
      ownerAddress: parsed.data.ownerAddress.toLowerCase(),
      sessionKeyAddress: parsed.data.sessionKeyAddress.toLowerCase(),
      chainId: parsed.data.chainId,
      permissions,
      scope,
      limits: parsed.data.limits ?? {},
      spendLimit: parsed.data.spendLimit,
      validFrom,
      validUntil,
      maxExecutions: parsed.data.maxExecutions,
    });
    return reply.status(201).send(serializeSessionKey(record));
  });

  app.get('/api/session-keys/:address', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = AddressParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid address' });
    }
    const records = await store.getByOwner(params.data.address.toLowerCase());
    return reply.send({ sessionKeys: records.map(serializeSessionKey) });
  });

  app.patch('/api/session-keys/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = IdParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid id' });
    }
    const body = UpdateLimitsBody.safeParse(req.body ?? {});
    if (!body.success) {
      return reply.status(400).send({ error: body.error.message });
    }
    const existing = await store.getById(params.data.id);
    if (!existing) return reply.status(404).send({ error: 'session_key_not_found' });

    const { spendLimit, ...limits } = body.data;
    await store.updateLimits(params.data.id, limits, spendLimit);
    const updated = await store.getById(params.data.id);
    return reply.send(serializeSessionKey(updated ?? existing));
  });

  app.delete('/api/session-keys/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = IdParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid id' });
    }
    const existing = await store.getById(params.data.id);
    if (!existing) return reply.status(404).send({ error: 'session_key_not_found' });
    await store.updateStatus(params.data.id, 'revoked');
    return reply.send({ id: params.data.id, status: 'revoked' });
  });

  app.get('/api/session-keys/:id/usage', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = IdParams.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({ error: 'invalid id' });
    }
    const existing = await store.getById(params.data.id);
    if (!existing) return reply.status(404).send({ error: 'session_key_not_found' });
    const usage = await store.getUsageStats(params.data.id);
    return reply.send({ id: params.data.id, ...usage });
  });
}
