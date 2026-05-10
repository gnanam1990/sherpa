import { describe, it, expect, vi } from 'vitest';
import {
  createResolver,
  isResolved,
  resolve,
  type ResolvedAddress,
  type ResolverError,
} from './index.js';
import type { SherpaConfig } from '@sherpa/config';

const baseConfig: SherpaConfig = {
  chain: {
    name: 'base-sepolia',
    chainId: 84532,
    rpcUrl: 'https://sepolia.base.org',
    basescanUrl: 'https://api-sepolia.basescan.org/api',
    explorerTxPrefix: 'https://sepolia.basescan.org/tx/',
  },
  rpcUrl: 'https://sepolia.base.org',
  useRealRpc: false,
  useRealDb: false,
  neynarBaseUrl: 'https://api.neynar.com',
  ethMainnetRpcUrl: 'https://ethereum.publicnode.com',
};

const farcasterAddr: ResolvedAddress = {
  address: '0x0000000000000000000000000000000000000abc',
  source: 'farcaster',
  display: '@vitalik',
};
const ensAddr: ResolvedAddress = {
  address: '0x0000000000000000000000000000000000000def',
  source: 'ens',
  display: 'vitalik.eth',
};
const basenameAddr: ResolvedAddress = {
  address: '0x0000000000000000000000000000000000000111',
  source: 'basename',
  display: 'jesse.base.eth',
};

describe('identity/resolve dispatcher', () => {
  it('returns direct source for a 0x address (no backends)', async () => {
    const out = await resolve('0x036CbD53842c5426634e7929541eC2318f3dCF7e');
    expect(isResolved(out)).toBe(true);
    if (isResolved(out)) expect(out.source).toBe('direct');
  });

  it('returns invalid_format for garbage', async () => {
    const out = await resolve('not-an-address');
    expect(isResolved(out)).toBe(false);
  });

  it('routes @handle to farcaster backend (handle stripped of @)', async () => {
    const seen: string[] = [];
    const out = await resolve('@vitalik', {
      resolveFarcaster: async (u) => {
        seen.push(u);
        return farcasterAddr;
      },
    });
    expect(seen).toEqual(['vitalik']);
    expect(isResolved(out) && out.source).toBe('farcaster');
  });

  it('routes *.base.eth before *.eth (Basenames precede ENS)', async () => {
    const out = await resolve('jesse.base.eth', {
      resolveBasename: async () => basenameAddr,
      resolveEns: async () => {
        throw new Error('ENS should not be invoked for basenames');
      },
    });
    expect(isResolved(out) && (out as ResolvedAddress).source).toBe('basename');
  });

  it('returns api_error when a backend is missing', async () => {
    const out = await resolve('jesse.base.eth');
    expect(isResolved(out)).toBe(false);
    if (!isResolved(out)) {
      expect(out.type).toBe('api_error');
      expect((out as Extract<ResolverError, { type: 'api_error' }>).provider).toBe('basename');
    }
  });
});

describe('createResolver — cache + backend wiring', () => {
  it('serves the LRU on a second call without re-invoking the backend', async () => {
    const fc = vi.fn(async () => farcasterAddr);
    const r = createResolver({
      config: { ...baseConfig, neynarApiKey: 'x' },
      backends: { resolveFarcaster: fc },
    });
    const a = await r('@vitalik');
    const b = await r('@vitalik');
    expect(isResolved(a) && isResolved(b)).toBe(true);
    expect(fc).toHaveBeenCalledTimes(1);
  });

  it('does not cache errors — second call retries', async () => {
    let i = 0;
    const ens = vi.fn(
      async (): Promise<ResolvedAddress | ResolverError> =>
        i++ === 0
          ? { type: 'api_error', input: 'vitalik.eth', provider: 'ens', message: 'flaky' }
          : ensAddr,
    );
    const r = createResolver({ config: baseConfig, backends: { resolveEns: ens } });
    const first = await r('vitalik.eth');
    const second = await r('vitalik.eth');
    expect(isResolved(first)).toBe(false);
    expect(isResolved(second)).toBe(true);
    expect(ens).toHaveBeenCalledTimes(2);
  });

  it('returns api_error for @handle when neynarApiKey is unset and no override', async () => {
    const r = createResolver({ config: baseConfig });
    const out = await r('@vitalik');
    expect(isResolved(out)).toBe(false);
    if (!isResolved(out)) expect(out.type).toBe('api_error');
  });
});
