import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'node:crypto';
import { createApiKey, createWebhook } from '@sherpa/tools';
import { z } from 'zod';

type StoredApiKey = {
  id: string;
  name: string;
  permissions: string[];
  rateLimit: number;
  usageCount: number;
  createdAt: number;
  expiresAt?: number;
  keyHash: string;
  keyPreview: string;
  revoked: boolean;
  revokedAt?: number;
};

type StoredWebhook = {
  id: string;
  url: string;
  events: string[];
  secretPreview: string;
  secretHash: string;
  status: 'active' | 'deleted';
  failureCount: number;
  createdAt: number;
  deletedAt?: number;
};

const apiKeys = new Map<string, StoredApiKey>();
const webhooks = new Map<string, StoredWebhook>();

const CreateApiKeyBody = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.string().min(1).max(80)).default(['read']),
  rateLimit: z.number().min(1).max(10000).default(1000),
  expiresAt: z.number().int().positive().optional(),
});

const CreateWebhookBody = z.object({
  url: z.string().url(),
  events: z.array(z.string().min(1).max(120)).min(1),
  secret: z.string().min(8).max(200).optional(),
});

const IdParams = z.object({ id: z.string().min(1).max(120) });

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function previewSecret(value: string): string {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function publicApiKey(key: StoredApiKey) {
  return {
    id: key.id,
    name: key.name,
    permissions: key.permissions,
    rateLimit: key.rateLimit,
    usageCount: key.usageCount,
    createdAt: key.createdAt,
    expiresAt: key.expiresAt,
    keyPreview: key.keyPreview,
    revoked: key.revoked,
    revokedAt: key.revokedAt,
  };
}

function publicWebhook(webhook: StoredWebhook) {
  return {
    id: webhook.id,
    url: webhook.url,
    events: webhook.events,
    secretPreview: webhook.secretPreview,
    status: webhook.status,
    failureCount: webhook.failureCount,
    createdAt: webhook.createdAt,
    deletedAt: webhook.deletedAt,
  };
}

export async function developerRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/developer/keys', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = CreateApiKeyBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });

    const created = createApiKey(parsed.data);
    const stored: StoredApiKey = {
      id: created.id,
      name: created.name,
      permissions: created.permissions,
      rateLimit: created.rateLimit,
      usageCount: created.usageCount,
      createdAt: created.createdAt,
      expiresAt: created.expiresAt,
      keyHash: sha256(created.key),
      keyPreview: previewSecret(created.key),
      revoked: false,
    };
    apiKeys.set(stored.id, stored);

    return reply.code(201).send({
      key: created.key,
      apiKey: publicApiKey(stored),
      warning: 'Store this key now. Sherpa only returns the full key once.',
    });
  });

  app.get('/api/developer/keys', async (req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ keys: Array.from(apiKeys.values()).map(publicApiKey) });
  });

  app.delete('/api/developer/keys/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = IdParams.safeParse(req.params);
    if (!params.success) return reply.status(400).send({ error: params.error.message });

    const key = apiKeys.get(params.data.id);
    if (!key) return reply.status(404).send({ error: 'api_key_not_found' });

    key.revoked = true;
    key.revokedAt = Date.now();
    apiKeys.set(key.id, key);
    return reply.send({ id: key.id, revoked: true });
  });

  app.post('/api/developer/webhooks', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = CreateWebhookBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.message });

    const created = createWebhook(parsed.data);
    const stored: StoredWebhook = {
      id: created.id,
      url: created.url,
      events: created.events,
      secretPreview: previewSecret(created.secret),
      secretHash: sha256(created.secret),
      status: 'active',
      failureCount: created.failureCount,
      createdAt: Date.now(),
    };
    webhooks.set(stored.id, stored);

    return reply.code(201).send({
      webhook: publicWebhook(stored),
      secret: created.secret,
      warning: 'Store this webhook secret now. Sherpa only returns the full secret once.',
    });
  });

  app.get('/api/developer/webhooks', async (req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ webhooks: Array.from(webhooks.values()).map(publicWebhook) });
  });

  app.delete('/api/developer/webhooks/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = IdParams.safeParse(req.params);
    if (!params.success) return reply.status(400).send({ error: params.error.message });

    const webhook = webhooks.get(params.data.id);
    if (!webhook) return reply.status(404).send({ error: 'webhook_not_found' });

    webhook.status = 'deleted';
    webhook.deletedAt = Date.now();
    webhooks.set(webhook.id, webhook);
    return reply.send({ id: webhook.id, deleted: true });
  });

  app.get('/api/developer/docs', async (req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      openapi: '3.0.0',
      info: { title: 'Sherpa API', version: '1.0.0' },
      servers: [{ url: 'https://sherpa-api.up.railway.app' }],
      paths: {},
    });
  });

  app.get('/api/developer/usage', async (req: FastifyRequest, reply: FastifyReply) => {
    const activeKeys = Array.from(apiKeys.values()).filter(key => !key.revoked);
    return reply.send({
      totalRequests: Array.from(apiKeys.values()).reduce((sum, key) => sum + key.usageCount, 0),
      requestsToday: 0,
      activeKeys: activeKeys.length,
      activeWebhooks: Array.from(webhooks.values()).filter(webhook => webhook.status === 'active').length,
      rateLimitRemaining: activeKeys.reduce((sum, key) => sum + key.rateLimit, 0),
      plan: 'free',
    });
  });
}
