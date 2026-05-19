/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { AERODROME_ROUTER_ADDRESS } from '@sherpa/safety';
import type { BuiltTx, VerifyResult } from '../types.js';
import { SWAP_EXACT_TOKENS_SELECTOR } from './swap-builder.js';
import type { AerodromeDeps } from './types.js';

/**
 * Verify that a BuiltTx is a valid Aerodrome swap.
 * Checks: correct target, zero value, correct selector.
 */
export async function verifySwap(
  tx: BuiltTx,
  deps: AerodromeDeps = {},
): Promise<VerifyResult> {
  const routerAddress = deps.routerAddress ?? AERODROME_ROUTER_ADDRESS;
  if (!routerAddress) {
    return { ok: false, reason: 'Aerodrome router not configured' };
  }
  if (tx.to.toLowerCase() !== routerAddress.toLowerCase()) {
    return { ok: false, reason: 'target is not Aerodrome router' };
  }
  if (tx.value !== 0n) {
    return { ok: false, reason: 'SWAP via ERC-20 must have value=0' };
  }
  if (!tx.data.startsWith(SWAP_EXACT_TOKENS_SELECTOR)) {
    return { ok: false, reason: 'calldata is not swapExactTokensForTokens' };
  }
  return { ok: true };
}
