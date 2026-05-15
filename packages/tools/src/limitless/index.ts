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
