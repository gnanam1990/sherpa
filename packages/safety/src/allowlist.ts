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
  // Limitless CTFExchange on Base Sepolia (placeholder — update once confirmed)
  LIMITLESS_FACTORY: '0x0000000000000000000000000000000000000001' as Address,
  // Uniswap V3 SwapRouter02 — Base Sepolia
  UNISWAP_ROUTER: '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4' as Address,
  // Uniswap V3 Quoter v2 — Base Sepolia
  UNISWAP_QUOTER: '0xC5290058841028F1614F3A6F0F5816cAd0df5E27' as Address,
  // WETH9 — Base Sepolia
  WETH: '0x4200000000000000000000000000000000000006' as Address,
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
