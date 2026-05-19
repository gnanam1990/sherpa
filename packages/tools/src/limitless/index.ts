/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export { searchMarkets, LimitlessNotConfiguredError } from './markets.js';
export { buildBuyOrderCall } from './order-builder.js';
export type {
  LimitlessMarket,
  LimitlessSearchParams,
  LimitlessOrderParams,
  LimitlessDeps,
} from './types.js';

// Re-export legacy adapter (Stage 2 compatibility)
export {
  createLimitless,
  limitless,
  buildApproveCall,
} from './adapter.js';
export type {
  BetParams,
  BetQuote,
  LimitlessConfig,
  LimitlessAdapter,
  FindMarketParams,
  LimitlessMarket as LegacyLimitlessMarket,
} from './adapter.js';
