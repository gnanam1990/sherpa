import type { ApiKey } from './types.js';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const API_KEY_PREFIX = 'sk_';
const API_KEY_RANDOM_BYTES = 36;
const API_KEY_RE = /^sk_[A-Za-z0-9_-]{48}$/;
const API_KEY_HASH_PREFIX = 'sha256_';

export function generateApiKey(): string {
  return `${API_KEY_PREFIX}${randomBytes(API_KEY_RANDOM_BYTES).toString('base64url')}`;
}

function hasValidApiKeyFormat(key: string): boolean {
  return API_KEY_RE.test(key);
}

export function hashApiKey(key: string): string {
  if (!hasValidApiKeyFormat(key)) {
    throw new Error('Invalid API key format');
  }
  return `${API_KEY_HASH_PREFIX}${createHash('sha256').update(key, 'utf8').digest('hex')}`;
}

export function validateApiKey(key: string, storedHash: string): boolean {
  if (!hasValidApiKeyFormat(key) || !storedHash.startsWith(API_KEY_HASH_PREFIX)) {
    return false;
  }

  const expected = hashApiKey(key);
  const provided = Buffer.from(storedHash, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  return provided.length === expectedBuffer.length && timingSafeEqual(provided, expectedBuffer);
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
