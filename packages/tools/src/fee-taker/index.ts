/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export { calculateFee, buildFeeTransfer } from './calculator.js';
export { FEE_TAKER_ABI, FEE_TAKER_ADDRESSES } from './contract.js';
export type {
  FeeConfig,
  FeeCalculation,
  FeeTransfer,
  FeeDeps,
} from './types.js';
