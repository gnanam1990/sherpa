import { describe, test, expect } from 'vitest';
import { generateApiKey, validateApiKey, hashApiKey, createApiKey } from './api-keys.js';

describe('API key management', () => {
  test('generateApiKey returns valid format', () => {
    const key = generateApiKey();
    expect(key.startsWith('sk_')).toBe(true);
    expect(key.length).toBe(51);
    expect(key).toMatch(/^sk_[A-Za-z0-9_-]{48}$/);
  });

  test('generateApiKey returns unique keys', () => {
    const keys = new Set(Array.from({ length: 100 }, () => generateApiKey()));
    expect(keys.size).toBe(100);
  });

  test('validateApiKey accepts key matching stored hash', () => {
    const key = generateApiKey();
    const hash = hashApiKey(key);
    expect(validateApiKey(key, hash)).toBe(true);
  });

  test('validateApiKey rejects invalid key', () => {
    expect(validateApiKey('invalid', 'sha256_deadbeef')).toBe(false);
  });

  test('validateApiKey rejects valid-format key with wrong hash', () => {
    const key = generateApiKey();
    const otherKey = generateApiKey();
    expect(validateApiKey(key, hashApiKey(otherKey))).toBe(false);
  });

  test('hashApiKey returns sha256 hash without leaking key material', () => {
    const key = generateApiKey();
    const hash = hashApiKey(key);
    expect(hash).not.toBe(key);
    expect(hash).toMatch(/^sha256_[a-f0-9]{64}$/);
    expect(hash.includes(key.slice(3, 11))).toBe(false);
  });

  test('hashApiKey rejects malformed keys', () => {
    expect(() => hashApiKey('sk_short')).toThrow('Invalid API key format');
  });

  test('createApiKey returns complete key object', () => {
    const key = createApiKey({ name: 'test', permissions: ['read'] });
    expect(key.key.startsWith('sk_')).toBe(true);
    expect(key.name).toBe('test');
    expect(key.permissions).toEqual(['read']);
  });
});
