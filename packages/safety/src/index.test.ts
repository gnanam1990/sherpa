import { describe, it, expect } from 'vitest';
import { ALLOWED_CONTRACTS, assertAllowlisted } from './index.js';

describe('safety/allowlist', () => {
  it('exports USDC on Base Sepolia', () => {
    expect(ALLOWED_CONTRACTS.USDC).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it('accepts an allowlisted address', () => {
    expect(() => assertAllowlisted(ALLOWED_CONTRACTS.USDC)).not.toThrow();
  });

  it('rejects an unknown address', () => {
    expect(() => assertAllowlisted('0x1111111111111111111111111111111111111111')).toThrow(
      /not in allowlist/,
    );
  });
});
