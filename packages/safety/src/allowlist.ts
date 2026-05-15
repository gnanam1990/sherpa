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

/**
 * Aerodrome Router on Base. Stage-2 SWAP target.
 *
 * TODO(m1-week-3): Aerodrome has no first-party Sepolia deployment as of
 * 2026-05. Mainnet Router is `0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43`,
 * but we deliberately do NOT hard-code mainnet addresses here — Stage 4
 * audit gates that. Until a Sepolia deployment exists or we're past the
 * mainnet flip, every code path that targets Aerodrome MUST throw a typed
 * error (see packages/tools/src/aerodrome.ts).
 */
export const AERODROME_ROUTER_ADDRESS: Address | undefined = undefined;

/**
 * Lido stETH on Base. Stage-2 STAKE target.
 *
 * TODO(m1-week-3): Confirm mainnet address and Sepolia availability.
 * Placeholder for now — adapters MUST throw when undefined.
 */
export const LIDO_STETH_ADDRESS: Address | undefined = undefined;

/**
 * Across spoke pool on Base. Stage-2 BRIDGE target.
 *
 * TODO(m1-week-3): Verify the real Across V3 spoke pool address on Base.
 * Mainnet is `0x0000000000000000000000000000000000000000` (placeholder).
 * Adapters MUST throw when undefined.
 */
export const ACROSS_SPOKE_POOL_BASE: Address | undefined = undefined;

/**
 * Morpho Blue on Base. Stage-2 LEND target.
 *
 * TODO(m1-week-3): Morpho Blue's Sepolia deployment is unconfirmed. Mainnet
 * is `0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb`, gated by the same Stage 4
 * rule as Aerodrome.
 */
export const MORPHO_BLUE_ADDRESS: Address | undefined = undefined;

/**
 * Aave V3 Pool on Base. Stage-2 LEND fallback when Morpho rates aren't
 * competitive or the asset isn't supported.
 *
 * TODO(m1-week-3): Aave V3 has Base Sepolia testnet deployments. The Pool
 * proxy on Sepolia changes occasionally — confirm the current address from
 * https://aave.com/docs before flipping this on. Until set, the adapter
 * throws.
 */
export const AAVE_V3_POOL_ADDRESS: Address | undefined = undefined;

/**
 * PolyForge prediction market factory on Base Sepolia.
 *
 * TODO(m1-week-3): replace with the real PolyForge factory address once
 * confirmed with the PolyForge team.
 */
export const POLYFORGE_FACTORY_ADDRESS: Address | undefined = undefined;

/**
 * Runtime-registered addresses (e.g. from env config).
 * Adapters call `registerAllowlistedAddress` at boot to inject
 * addresses that aren't in the static allowlist.
 */
const DYNAMIC_ALLOWLIST = new Set<string>();

export function registerAllowlistedAddress(address: Address): void {
  DYNAMIC_ALLOWLIST.add(address.toLowerCase());
}

export function clearDynamicAllowlist(): void {
  DYNAMIC_ALLOWLIST.clear();
}

export function isAllowlisted(target: Address, extras: readonly Address[] = []): boolean {
  const t = target.toLowerCase();
  if (DYNAMIC_ALLOWLIST.has(t)) return true;
  if (Object.values(ALLOWED_CONTRACTS).some((addr) => addr.toLowerCase() === t)) return true;
  if (LIMITLESS_FACTORY_ADDRESS && LIMITLESS_FACTORY_ADDRESS.toLowerCase() === t) return true;
  if (AERODROME_ROUTER_ADDRESS && AERODROME_ROUTER_ADDRESS.toLowerCase() === t) return true;
  if (LIDO_STETH_ADDRESS && LIDO_STETH_ADDRESS.toLowerCase() === t) return true;
  if (ACROSS_SPOKE_POOL_BASE && ACROSS_SPOKE_POOL_BASE.toLowerCase() === t) return true;
  if (MORPHO_BLUE_ADDRESS && MORPHO_BLUE_ADDRESS.toLowerCase() === t) return true;
  if (AAVE_V3_POOL_ADDRESS && AAVE_V3_POOL_ADDRESS.toLowerCase() === t) return true;
  if (POLYFORGE_FACTORY_ADDRESS && POLYFORGE_FACTORY_ADDRESS.toLowerCase() === t) return true;
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

/**
 * Verify that a target address matches the known Aave V3 Pool.
 * Used by the LEND adapter to ensure we're only interacting with
 * the audited Aave deployment.
 */
export function assertAavePool(target: Address): void {
  if (!AAVE_V3_POOL_ADDRESS) {
    throw new Error('[safety] Aave V3 Pool address not configured');
  }
  if (target.toLowerCase() !== AAVE_V3_POOL_ADDRESS.toLowerCase()) {
    throw new Error(`[safety] target ${target} is not the Aave V3 Pool`);
  }
}

export function registerTreasuryAddress(address: Address): void {
  registerAllowlistedAddress(address);
}
