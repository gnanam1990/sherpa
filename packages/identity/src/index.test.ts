import { describe, it, expect } from 'vitest';
import { resolve, isResolved } from './index.js';

describe('identity/resolve', () => {
  it('returns direct source for a 0x address', async () => {
    const out = await resolve('0x036CbD53842c5426634e7929541eC2318f3dCF7e');
    expect(isResolved(out)).toBe(true);
    if (isResolved(out)) expect(out.source).toBe('direct');
  });

  it('returns invalid_format for garbage', async () => {
    const out = await resolve('not-an-address');
    expect(isResolved(out)).toBe(false);
  });

  it('routes @handle to farcaster resolver when configured', async () => {
    const out = await resolve('@vitalik', {
      resolveFarcaster: async (u) => ({
        address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        source: 'farcaster',
        display: `@${u}`,
        metadata: { farcaster_username: u, farcaster_fid: 5650 },
      }),
    });
    expect(isResolved(out) && out.source).toBe('farcaster');
  });

  it('returns api_error for .base.eth when no backend wired', async () => {
    const out = await resolve('jesse.base.eth');
    expect(isResolved(out)).toBe(false);
    if (!isResolved(out)) expect(out.type).toBe('api_error');
  });
});
