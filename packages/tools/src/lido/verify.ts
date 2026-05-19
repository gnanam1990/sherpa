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
import { SUBMIT_SELECTOR } from './steth.js';
import type { LidoDeps } from './types.js';
import { LIDO_STETH_ADDRESS } from './types.js';

export async function verifyStake(
  tx: BuiltTx,
  deps: LidoDeps = {},
): Promise<VerifyResult> {
  const stethAddress = deps.stethAddress ?? (deps.chainId != null ? LIDO_STETH_ADDRESS[deps.chainId] : undefined);
  if (!stethAddress) {
    return { ok: false, reason: 'Lido stETH address not configured' };
  }
  if (tx.to.toLowerCase() !== stethAddress.toLowerCase()) {
    return { ok: false, reason: 'target is not Lido stETH' };
  }
  if (tx.value <= 0n) {
    return { ok: false, reason: 'STAKE must have value > 0' };
  }
  if (!tx.data.startsWith(SUBMIT_SELECTOR)) {
    return { ok: false, reason: 'calldata is not Lido submit' };
  }
  return { ok: true };
}
