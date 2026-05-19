import { createHmac } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { createWebhook, generateWebhookSecret, verifyWebhookSignature } from './webhooks.js';

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

describe('Webhook management', () => {
  test('generateWebhookSecret returns high-entropy secret format', () => {
    const secret = generateWebhookSecret();
    expect(secret).toMatch(/^whsec_[A-Za-z0-9_-]{43}$/);
  });

  test('generateWebhookSecret returns unique secrets', () => {
    const secrets = new Set(Array.from({ length: 100 }, () => generateWebhookSecret()));
    expect(secrets.size).toBe(100);
  });

  test('createWebhook generates a secret when omitted', () => {
    const webhook = createWebhook({ url: 'https://example.com/webhook', events: ['swap.created'] });
    expect(webhook.secret).toMatch(/^whsec_[A-Za-z0-9_-]{43}$/);
    expect(webhook.status).toBe('active');
  });

  test('verifyWebhookSignature accepts matching HMAC signature', () => {
    const secret = generateWebhookSecret();
    const payload = '{"event":"swap.created"}';
    expect(verifyWebhookSignature(payload, sign(payload, secret), secret)).toBe(true);
  });

  test('verifyWebhookSignature accepts sha256-prefixed signature', () => {
    const secret = generateWebhookSecret();
    const payload = '{"event":"swap.created"}';
    expect(verifyWebhookSignature(payload, `sha256=${sign(payload, secret)}`, secret)).toBe(true);
  });

  test('verifyWebhookSignature rejects tampered payload', () => {
    const secret = generateWebhookSecret();
    const payload = '{"event":"swap.created"}';
    const signature = sign(payload, secret);
    expect(verifyWebhookSignature('{"event":"swap.deleted"}', signature, secret)).toBe(false);
  });

  test('verifyWebhookSignature rejects malformed and empty inputs', () => {
    const secret = generateWebhookSecret();
    expect(verifyWebhookSignature('payload', 'not-a-signature', secret)).toBe(false);
    expect(verifyWebhookSignature('payload', '', secret)).toBe(false);
    expect(verifyWebhookSignature('payload', sign('payload', secret), '')).toBe(false);
  });
});
