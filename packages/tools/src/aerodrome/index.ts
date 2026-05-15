/**
 * Aerodrome SWAP adapter — modular structure (Stage 2).
 *
 * Re-exports for backward compatibility with imports from '@sherpa/tools'.
 * The old `aerodrome.ts` is replaced by this folder.
 */

export { AerodromeNotConfiguredError, PoolNotFoundError, TokenNotFoundError, quote } from './quoter.js';
export { buildSwapCall, buildSwapWithFee, SWAP_EXACT_TOKENS_SELECTOR, type SwapWithFeeResult } from './swap-builder.js';
export { verifySwap } from './verify.js';
export { stubQuote, priceConvert } from './stub-pricing.js';
export type { SwapAsset, SwapParams, SwapQuote, AerodromeQuote, AerodromeRoute, AerodromeDeps, SwapFeeConfig } from './types.js';
export { DEFAULT_SLIPPAGE_BPS, DEFAULT_DEADLINE_SECONDS, ZERO_ADDRESS } from './types.js';
export { buildAddLiquidityCall, type LPParams } from './lp-builder.js';
export type { LPQuoteParams, LPQuote } from './lp-types.js';

/**
 * Backward-compatible adapter factory. Returns a ToolAdapter-shaped object
 * wrapping the modular quote/buildSwapCall/verifySwap functions.
 */
import { AERODROME_ROUTER_ADDRESS, type Address } from '@sherpa/safety';
import type { ToolAdapter } from '../types.js';
import { quote as doQuote } from './quoter.js';
import { buildSwapCall } from './swap-builder.js';
import { verifySwap } from './verify.js';
import type { AerodromeDeps, SwapParams, SwapQuote } from './types.js';

const AERODROME_ROUTER: Record<number, Address | undefined> = {
  84532: undefined, // Sepolia - not deployed (use stub)
  8453: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43', // Base mainnet
};

export type AerodromeAdapter = ToolAdapter<SwapParams, SwapQuote, SwapParams> & {
  routerAddress: Address | undefined;
};

export function createAerodrome(deps: AerodromeDeps & { chainId?: number } = {}): AerodromeAdapter {
  const chainRouter = deps.chainId != null ? AERODROME_ROUTER[deps.chainId] : undefined;
  const routerAddress = deps.routerAddress ?? chainRouter ?? AERODROME_ROUTER_ADDRESS;

  return {
    name: 'aerodrome',
    routerAddress,
    quote: async (params) => {
      const q = await doQuote(params.fromAsset, params.toAsset, params.amountIn, deps);
      return {
        fromAsset: q.fromAsset,
        toAsset: q.toAsset,
        amountInBaseUnits: q.amountInBaseUnits,
        amountOutBaseUnits: q.amountOutBaseUnits,
        display: q.display,
        route: q.route,
      };
    },
    buildTx: async (params) => {
      const result = await buildSwapCall(
        params.fromAsset,
        params.toAsset,
        params.amountIn,
        params.recipient,
        deps,
      );
      return { to: result.to, data: result.data, value: result.value, sponsorable: result.sponsorable };
    },
    verify: async (tx) => verifySwap(tx, deps),
  };
}

/** Default unconfigured adapter instance. */
export const aerodrome = createAerodrome();
