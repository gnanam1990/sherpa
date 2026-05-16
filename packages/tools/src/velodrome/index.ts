/**
 * Velodrome DEX adapter for Optimism (Stage 8).
 *
 * Re-exports for use with '@sherpa/tools'.
 */

export { quote, VelodromeNotConfiguredError, TokenNotFoundError } from './quoter.js';
export { buildSwapCall, SWAP_EXACT_TOKENS_SELECTOR, type SwapBuildResult } from './swap-builder.js';
export { verifySwap } from './verify.js';
export type { VelodromeAsset, VelodromeParams, VelodromeQuote, VelodromeDeps } from './types.js';
export { VELODROME_CHAIN_ID, DEFAULT_SLIPPAGE_BPS, DEFAULT_DEADLINE_SECONDS } from './types.js';

import type { Address } from '@sherpa/safety';
import type { ToolAdapter } from '../types.js';
import { quote as doQuote } from './quoter.js';
import { buildSwapCall } from './swap-builder.js';
import { verifySwap } from './verify.js';
import type { VelodromeDeps, VelodromeParams, VelodromeQuote } from './types.js';

export type VelodromeAdapter = ToolAdapter<VelodromeParams, VelodromeQuote, VelodromeParams> & {
  routerAddress: Address;
};

export function createVelodrome(deps: VelodromeDeps = {}): VelodromeAdapter {
  const routerAddress = (deps.routerAddress ?? '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858') as Address;
  return {
    name: 'velodrome',
    routerAddress,
    quote: async (params) => doQuote(params.fromAsset, params.toAsset, params.amountIn, deps),
    buildTx: async (params) => {
      const result = await buildSwapCall(params.fromAsset, params.toAsset, params.amountIn, params.recipient, deps);
      return { to: result.to, data: result.data, value: result.value, sponsorable: result.sponsorable };
    },
    verify: async (tx) => verifySwap(tx, deps),
  };
}

export const velodrome = createVelodrome();
