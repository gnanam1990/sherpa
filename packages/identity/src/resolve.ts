import type { Address, ResolvedAddress, ResolverError } from './types.js';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/**
 * Stub resolver. Only handles direct 0x addresses in Week 1; Farcaster /
 * Basenames / ENS implementations land in later weeks.
 */
export async function resolve(input: string): Promise<ResolvedAddress | ResolverError> {
  const trimmed = input.trim();

  if (ADDRESS_RE.test(trimmed)) {
    return {
      address: trimmed as Address,
      source: 'direct',
      display: trimmed,
    };
  }

  return { type: 'invalid_format', input };
}
