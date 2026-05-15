import { describe, test, expect } from 'vitest';
import { generateApiKey, validateApiKey, hashApiKey, createApiKey } from './api-keys.js';

describe('API key management', () => {
  test('generateApiKey returns valid format', () => {
    const key = generateApiKey();
    expect(key.startsWith('sk_')).toBe(true);
    expect(key.length).toBe(51);
  });

  test('validateApiKey accepts valid key', () => {
    const key = generateApiKey();
    expect(validateApiKey(key)).toBe(true);
  });

  test('validateApiKey rejects invalid key', () => {
    expect(validateApiKey('invalid')).toBe(false);
  });

  test('hashApiKey returns different value', () => {
    const key = generateApiKey();
    const hash = hashApiKey(key);
    expect(hash).not.toBe(key);
  });

  test('createApiKey returns complete key object', () => {
    const key = createApiKey({ name: 'test', permissions: ['read'] });
    expect(key.key.startsWith('sk_')).toBe(true);
    expect(key.name).toBe('test');
    expect(key.permissions).toEqual(['read']);
  });
});
