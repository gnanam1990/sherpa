import { describe, it, expect, vi } from 'vitest';
import type { PublicClient } from 'viem';
import { createEnsBackend } from './ens.js';

vi.mock('viem/actions', async (orig) => {
  const real = (await orig()) as Record<string, unknown>;
  return {
    ...real,
    getEnsAddress: vi.fn(),
  };
});

import { getEnsAddress } from 'viem/actions';

const mockGetEnsAddress = getEnsAddress as unknown as ReturnType<typeof vi.fn>;

describe('ens backend', () => {
  it('resolves *.eth via viem getEnsAddress', async () => {
    mockGetEnsAddress.mockResolvedValueOnce('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
    const ens = createEnsBackend({ client: {} as unknown as PublicClient });
    const out = await ens('vitalik.eth');
    expect(mockGetEnsAddress).toHaveBeenCalledWith(expect.anything(), { name: 'vitalik.eth' });
    if ('address' in out) {
      expect(out.address).toBe('0xd8da6bf26964af9d7eed9e03e53415d37aa96045');
      expect(out.source).toBe('ens');
      expect(out.metadata?.ens_name).toBe('vitalik.eth');
    } else {
      throw new Error('expected resolved');
    }
  });

  it('returns not_found when getEnsAddress returns null', async () => {
    mockGetEnsAddress.mockResolvedValueOnce(null);
    const ens = createEnsBackend({ client: {} as unknown as PublicClient });
    const out = await ens('ghost.eth');
    expect('type' in out && (out as { type: string }).type).toBe('not_found');
  });

  it('wraps RPC errors as api_error with provider=ens', async () => {
    mockGetEnsAddress.mockRejectedValueOnce(new Error('rpc 429'));
    const ens = createEnsBackend({ client: {} as unknown as PublicClient });
    const out = await ens('vitalik.eth');
    if ('type' in out) {
      expect(out.type).toBe('api_error');
      expect((out as { provider: string }).provider).toBe('ens');
    } else {
      throw new Error('expected error');
    }
  });
});
