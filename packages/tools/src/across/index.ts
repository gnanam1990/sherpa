/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 * Across Protocol BRIDGE adapter — modular structure (Stage 2).
 *
 * Re-exports for use with '@sherpa/tools'.
 */

export { getBridgeQuote } from './quoter.js';
export { buildBridgeCall, type BridgeCallResult } from './bridge-builder.js';
export type { BridgeParams, BridgeQuote } from './types.js';
export { SUPPORTED_CHAINS, CHAIN_IDS, SUPPORTED_BRIDGE_PAIRS, isBridgePairSupported } from './types.js';

import type { Address } from '@sherpa/safety';
import type { ToolAdapter } from '../types.js';
import type { BridgeParams, BridgeQuote } from './types.js';
import { getBridgeQuote } from './quoter.js';
import { buildBridgeCall } from './bridge-builder.js';

export type AcrossAdapter = ToolAdapter<BridgeParams, BridgeQuote, BridgeParams>;

export function createAcross(): AcrossAdapter {
  return {
    name: 'across',
    quote: (params) => getBridgeQuote(params),
    buildTx: async (params) => {
      const quote = await getBridgeQuote(params);
      // Stub addresses — real integration would resolve these from params
      const zeroAddr = '0x0000000000000000000000000000000000000000' as Address;
      const result = await buildBridgeCall(params, quote, zeroAddr, zeroAddr, zeroAddr);
      return {
        to: result.to,
        data: result.data,
        value: result.value,
        sponsorable: result.sponsorable,
      };
    },
    verify: async () => ({ ok: true }),
  };
}

/** Default adapter instance. */
export const across = createAcross();
