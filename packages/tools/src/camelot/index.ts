/**
 * Camelot DEX adapter for Arbitrum (Stage 8).
 *
 * Re-exports for use with '@sherpa/tools'.
 */

export { quote, CamelotNotConfiguredError, TokenNotFoundError } from './quoter.js';
export { buildSwapCall, SWAP_EXACT_TOKENS_SELECTOR, type SwapBuildResult } from './swap-builder.js';
export { verifySwap } from './verify.js';
export type { CamelotAsset, CamelotParams, CamelotQuote, CamelotDeps } from './types.js';
export { CAMELOT_CHAIN_ID, DEFAULT_SLIPPAGE_BPS, DEFAULT_DEADLINE_SECONDS } from './types.js';

import type { Address } from '@sherpa/safety';
import type { ToolAdapter, BuiltTx } from '../types.js';
import { quote as doQuote } from './quoter.js';
import { buildSwapCall } from './swap-builder.js';
import { verifySwap } from './verify.js';
import type { CamelotDeps, CamelotParams, CamelotQuote } from './types.js';

export type CamelotAdapter = ToolAdapter<CamelotParams, CamelotQuote, CamelotParams> & {
  routerAddress: Address;
};

export function createCamelot(deps: CamelotDeps = {}): CamelotAdapter {
  const routerAddress = (deps.routerAddress ?? '0xc873fEcbd354f5A56E00E710B90EF4201db2448d') as Address;
  return {
    name: 'camelot',
    routerAddress,
    quote: async (params) => doQuote(params.fromAsset, params.toAsset, params.amountIn, deps),
    buildTx: async (params) => {
      const result = await buildSwapCall(params.fromAsset, params.toAsset, params.amountIn, params.recipient, deps);
      return { to: result.to, data: result.data, value: result.value, sponsorable: result.sponsorable };
    },
    verify: async (tx) => verifySwap(tx, deps),
  };
}

export const camelot = createCamelot();
