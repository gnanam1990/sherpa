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
  // Uniswap V3 SwapRouter02 — Base Sepolia
  UNISWAP_ROUTER: '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4' as Address,
  // Uniswap V3 Quoter v2 — Base Sepolia
  UNISWAP_QUOTER: '0xC5290058841028F1614F3A6F0F5816cAd0df5E27' as Address,
  // WETH9 — Base Sepolia
  WETH: '0x4200000000000000000000000000000000000006' as Address,
} as const;

export type AllowedContractName = keyof typeof ALLOWED_CONTRACTS;

/**
 * Limitless CTFExchange on Base Sepolia.
 *
 * TODO(m1-week-2): replace with the real Base-Sepolia CTFExchange address
 * once confirmed with the Limitless team. Until then this is `undefined`
 * and every code path that targets Limitless MUST surface a typed error
 * (`LimitlessNotConfiguredError` in packages/tools/src/limitless.ts) rather
 * than silently use a placeholder.
 *
 * Why undefined and not a sentinel like 0x…0001: a sentinel still has to
 * be added to `ALLOWED_CONTRACTS` to pass `assertAllowlisted`, and at that
 * point the Ring 2 check happily approves calldata addressed to address
 * 0x…0001 — which is exactly the hole this guards against.
 */
export const LIMITLESS_FACTORY_ADDRESS: Address | undefined = undefined;

export function isAllowlisted(target: Address, extras: readonly Address[] = []): boolean {
  const t = target.toLowerCase();
  if (Object.values(ALLOWED_CONTRACTS).some((addr) => addr.toLowerCase() === t)) return true;
  if (LIMITLESS_FACTORY_ADDRESS && LIMITLESS_FACTORY_ADDRESS.toLowerCase() === t) return true;
  if (extras.some((addr) => addr.toLowerCase() === t)) return true;
  return false;
}

/**
 * Throws if `target` is not in the allowlist.
 *
 * `extras` are caller-vouched addresses — used by an adapter that knows it has
 * been configured with a non-default address (e.g. a `createLimitless`
 * adapter built with an explicit `factoryAddress`). Production code paths
 * should leave `extras` empty.
 */
export function assertAllowlisted(target: Address, extras: readonly Address[] = []): void {
  if (!isAllowlisted(target, extras)) {
    throw new Error(`[safety] target ${target} not in allowlist`);
  }
}
