import { describe, it, expect } from 'vitest';
import type { PublicClient } from 'viem';
import { createAddressBackend } from './address.js';

function makeClient(opts: {
  nonce?: number | Error;
  code?: string | Error;
}): PublicClient {
  return {
    async getTransactionCount() {
      if (opts.nonce instanceof Error) throw opts.nonce;
      return opts.nonce ?? 0;
    },
    async getCode() {
      if (opts.code instanceof Error) throw opts.code;
      return opts.code ?? '0x';
    },
  } as unknown as PublicClient;
}

const ADDR = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

describe('address backend', () => {
  it('rejects invalid format', async () => {
    const a = createAddressBackend({ skipActivityCheck: true });
    const out = await a('not-an-address');
    expect('type' in out && (out as { type: string }).type).toBe('invalid_format');
  });

  it('lowercases and resolves a valid checksum address (skip activity)', async () => {
    const a = createAddressBackend({ skipActivityCheck: true });
    const out = await a(ADDR);
    if ('address' in out) {
      expect(out.address).toBe(ADDR.toLowerCase());
      expect(out.source).toBe('direct');
      expect(out.metadata).toBeUndefined();
    } else {
      throw new Error('expected resolved');
    }
  });

  it('marks has_activity=true when nonce > 0', async () => {
    const a = createAddressBackend({ client: makeClient({ nonce: 7, code: '0x' }) });
    const out = await a(ADDR);
    if ('address' in out) {
      expect(out.metadata?.has_activity).toBe(true);
      expect(out.metadata?.is_contract).toBe(false);
    } else {
      throw new Error('expected resolved');
    }
  });

  it('marks is_contract=true when getCode returns bytecode', async () => {
    const a = createAddressBackend({
      client: makeClient({ nonce: 0, code: '0x6080604052' }),
    });
    const out = await a(ADDR);
    if ('address' in out) {
      expect(out.metadata?.is_contract).toBe(true);
      // EOAs only — has_activity tracks nonce, not contract bytecode.
      expect(out.metadata?.has_activity).toBe(false);
    } else {
      throw new Error('expected resolved');
    }
  });

  it('falls back to a bare ResolvedAddress when the RPC throws', async () => {
    const a = createAddressBackend({
      client: makeClient({ nonce: new Error('rpc down'), code: '0x' }),
    });
    const out = await a(ADDR);
    if ('address' in out) {
      expect(out.metadata).toBeUndefined();
    } else {
      throw new Error('expected resolved');
    }
  });
});
