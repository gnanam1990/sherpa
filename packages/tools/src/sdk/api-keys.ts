import type { ApiKey } from './types.js';

export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'sk_';
  for (let i = 0; i < 48; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function validateApiKey(key: string): boolean {
  return key.startsWith('sk_') && key.length === 51;
}

export function hashApiKey(key: string): string {
  return 'hashed_' + key.slice(3, 11);
}

export function createApiKey(params: {
  name: string;
  permissions: string[];
  rateLimit?: number;
  expiresAt?: number;
}): ApiKey {
  return {
    id: crypto.randomUUID(),
    key: generateApiKey(),
    name: params.name,
    permissions: params.permissions,
    rateLimit: params.rateLimit ?? 1000,
    usageCount: 0,
    createdAt: Date.now(),
    expiresAt: params.expiresAt,
  };
}
