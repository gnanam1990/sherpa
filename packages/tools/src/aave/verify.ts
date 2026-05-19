/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { AAVE_V3_POOL_ADDRESS } from '@sherpa/safety';
import type { BuiltTx, VerifyResult } from '../types.js';
import { SUPPLY_SELECTOR, WITHDRAW_SELECTOR } from './pool.js';
import type { AaveDeps } from './types.js';

export async function verifySupply(
  tx: BuiltTx,
  deps: AaveDeps = {},
): Promise<VerifyResult> {
  const poolAddress = deps.poolAddress ?? AAVE_V3_POOL_ADDRESS;
  if (!poolAddress) {
    return { ok: false, reason: 'Aave V3 Pool address not configured' };
  }
  if (tx.to.toLowerCase() !== poolAddress.toLowerCase()) {
    return { ok: false, reason: 'target is not Aave V3 Pool' };
  }
  if (tx.value !== 0n) {
    return { ok: false, reason: 'LEND must have value=0' };
  }
  if (!tx.data.startsWith(SUPPLY_SELECTOR) && !tx.data.startsWith(WITHDRAW_SELECTOR)) {
    return { ok: false, reason: 'calldata is not Aave supply/withdraw' };
  }
  return { ok: true };
}
