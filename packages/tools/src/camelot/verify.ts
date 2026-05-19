/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { BuiltTx, VerifyResult } from '../types.js';
import { SWAP_EXACT_TOKENS_SELECTOR } from './swap-builder.js';
import type { CamelotDeps } from './types.js';

const DEFAULT_ROUTER = '0xc873fEcbd354f5A56E00E710B90EF4201db2448d';

export async function verifySwap(
  tx: BuiltTx,
  deps: CamelotDeps = {},
): Promise<VerifyResult> {
  const routerAddress = deps.routerAddress ?? DEFAULT_ROUTER;
  if (tx.to.toLowerCase() !== routerAddress.toLowerCase()) {
    return { ok: false, reason: 'target is not Camelot router' };
  }
  if (tx.value !== 0n) {
    return { ok: false, reason: 'SWAP via ERC-20 must have value=0' };
  }
  if (!tx.data.startsWith(SWAP_EXACT_TOKENS_SELECTOR)) {
    return { ok: false, reason: 'calldata is not swapExactTokensForTokens' };
  }
  return { ok: true };
}
