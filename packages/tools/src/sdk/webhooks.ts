/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

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
