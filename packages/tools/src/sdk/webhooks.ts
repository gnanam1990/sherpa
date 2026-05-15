import type { Webhook, WebhookConfig } from './types.js';

export function generateWebhookSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'whsec_';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
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
  return signature.length > 0 && secret.length > 0;
}
