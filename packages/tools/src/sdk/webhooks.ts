import type { Webhook, WebhookConfig } from './types.js';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const WEBHOOK_SECRET_PREFIX = 'whsec_';
const WEBHOOK_SECRET_BYTES = 32;
const HEX_SHA256_RE = /^[a-f0-9]{64}$/i;

export function generateWebhookSecret(): string {
  return `${WEBHOOK_SECRET_PREFIX}${randomBytes(WEBHOOK_SECRET_BYTES).toString('base64url')}`;
}

export function createWebhook(config: WebhookConfig): Webhook {
  return {
    id: crypto.randomUUID(),
    url: config.url,
    events: config.events,
    secret: config.secret ?? generateWebhookSecret(),
    status: 'active',
    failureCount: 0,
  };
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  if (!secret || !signature) {
    return false;
  }

  const normalizedSignature = signature.startsWith('sha256=')
    ? signature.slice('sha256='.length)
    : signature;

  if (!HEX_SHA256_RE.test(normalizedSignature)) {
    return false;
  }

  const expected = createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
  const providedBuffer = Buffer.from(normalizedSignature, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');

  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}
