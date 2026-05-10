import { describe, it, expect } from 'vitest';
import { namehash, type PublicClient } from 'viem';
import { createBasenamesBackend } from './basenames.js';

type Call = { args: Record<string, unknown> };

function makeClient(replies: Array<{ value?: unknown; throws?: Error }>) {
  const calls: Call[] = [];
  let i = 0;
  const client = {
    async readContract(args: Record<string, unknown>) {
      calls.push({ args });
      const reply = replies[i++];
      if (!reply) throw new Error('unscripted readContract');
      if (reply.throws) throw reply.throws;
      return reply.value;
    },
  } as unknown as PublicClient;
  return { client, calls };
}

describe('basenames backend', () => {
  it('reads addr(namehash) on the L2 resolver with the correct namehash arg', async () => {
    const { client, calls } = makeClient([
      { value: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' },
    ]);
    const bn = createBasenamesBackend({ client });
    const out = await bn('jesse.base.eth');
    expect(calls.length).toBe(1);
    expect(calls[0]!.args.functionName).toBe('addr');
    // Default resolver address from @sherpa/config.
    expect((calls[0]!.args.address as string).toLowerCase()).toBe(
      '0xc6d566a56a1aff6508b41f6c90ff131615583bcd',
    );
    // namehash is deterministic; assert it explicitly so a regression that
    // swapped namehash() for keccak256() or labelhash() would fail.
    const args = calls[0]!.args.args as readonly unknown[];
    expect(args[0]).toBe(namehash('jesse.base.eth'));
    if ('address' in out) {
      expect(out.address).toBe('0xd8da6bf26964af9d7eed9e03e53415d37aa96045');
      expect(out.source).toBe('basename');
      expect(out.metadata?.basename).toBe('jesse.base.eth');
    } else {
      throw new Error('expected resolved');
    }
  });

  it('returns not_found when resolver returns the zero address', async () => {
    const { client } = makeClient([{ value: '0x0000000000000000000000000000000000000000' }]);
    const bn = createBasenamesBackend({ client });
    const out = await bn('ghost.base.eth');
    expect('type' in out && (out as { type: string }).type).toBe('not_found');
  });

  it('returns api_error when the RPC throws', async () => {
    const { client } = makeClient([{ throws: new Error('rpc dead') }]);
    const bn = createBasenamesBackend({ client });
    const out = await bn('x.base.eth');
    if ('type' in out) {
      expect(out.type).toBe('api_error');
      expect((out as { provider: string }).provider).toBe('basename');
    } else {
      throw new Error('expected error');
    }
  });

  it('honours a resolver address override', async () => {
    const { client, calls } = makeClient([
      { value: '0x036cbd53842c5426634e7929541ec2318f3dcf7e' },
    ]);
    const bn = createBasenamesBackend({
      client,
      resolverAddress: '0x1111111111111111111111111111111111111111',
    });
    await bn('a.base.eth');
    expect((calls[0]!.args.address as string).toLowerCase()).toBe(
      '0x1111111111111111111111111111111111111111',
    );
  });
});
