/**
 * QuickSwap DEX adapter for Polygon (Stage 8).
 *
 * Re-exports for use with '@sherpa/tools'.
 */

export { quote, QuickSwapNotConfiguredError, TokenNotFoundError } from './quoter.js';
export { buildSwapCall, SWAP_EXACT_TOKENS_SELECTOR, type SwapBuildResult } from './swap-builder.js';
export { verifySwap } from './verify.js';
export type { QuickSwapAsset, QuickSwapParams, QuickSwapQuote, QuickSwapDeps } from './types.js';
export { QUICKSWAP_CHAIN_ID, DEFAULT_SLIPPAGE_BPS, DEFAULT_DEADLINE_SECONDS } from './types.js';

import type { Address } from '@sherpa/safety';
import type { ToolAdapter } from '../types.js';
import { quote as doQuote } from './quoter.js';
import { buildSwapCall } from './swap-builder.js';
import { verifySwap } from './verify.js';
import type { QuickSwapDeps, QuickSwapParams, QuickSwapQuote } from './types.js';

export type QuickSwapAdapter = ToolAdapter<QuickSwapParams, QuickSwapQuote, QuickSwapParams> & {
  routerAddress: Address;
};

export function createQuickSwap(deps: QuickSwapDeps = {}): QuickSwapAdapter {
  const routerAddress = (deps.routerAddress ?? '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff') as Address;
  return {
    name: 'quickswap',
    routerAddress,
    quote: async (params) => doQuote(params.fromAsset, params.toAsset, params.amountIn, deps),
    buildTx: async (params) => {
      const result = await buildSwapCall(params.fromAsset, params.toAsset, params.amountIn, params.recipient, deps);
      return { to: result.to, data: result.data, value: result.value, sponsorable: result.sponsorable };
    },
    verify: async (tx) => verifySwap(tx, deps),
  };
}

export const quickswap = createQuickSwap();
