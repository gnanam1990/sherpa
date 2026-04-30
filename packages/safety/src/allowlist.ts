import type { Address } from './types.js';

/**
 * Base Sepolia allowlisted contracts.
 *
 * Any adapter building a tx MUST assert its target address is present in this
 * map before emitting calldata. Mainnet addresses are added only after the
 * Stage-4 audit.
 */
export const ALLOWED_CONTRACTS = {
  // USDC on Base Sepolia
  USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
  // Limitless factory (placeholder — update once confirmed on Sepolia)
  LIMITLESS_FACTORY: '0x0000000000000000000000000000000000000000' as Address,
} as const;

export type AllowedContractName = keyof typeof ALLOWED_CONTRACTS;

/** Throws if `target` is not in the allowlist. */
export function assertAllowlisted(target: Address): void {
  const found = Object.values(ALLOWED_CONTRACTS).some(
    (addr) => addr.toLowerCase() === target.toLowerCase(),
  );
  if (!found) {
    throw new Error(`[safety] target ${target} not in allowlist`);
  }
}
