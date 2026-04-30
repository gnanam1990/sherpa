import { describe, it, expect } from 'vitest';
import { resolve } from './index.js';

describe('identity/resolve', () => {
  it('returns a direct ResolvedAddress for a 0x address', async () => {
    const out = await resolve('0x036CbD53842c5426634e7929541eC2318f3dCF7e');
    expect('source' in out && out.source).toBe('direct');
  });

  it('returns invalid_format for garbage input', async () => {
    const out = await resolve('not-an-address');
    expect('type' in out && out.type).toBe('invalid_format');
  });
});
