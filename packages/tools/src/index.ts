/**
 * @sherpa/tools — protocol adapters (M1 ownership).
 *
 * Every adapter exports `quote()`, `buildTx()`, `verify()` — names
 * non-negotiable per M1_BACKEND_PACK.
 */

export * from './types.js';
export { usdc } from './usdc.js';
export type { UsdcTransferParams, UsdcQuote } from './usdc.js';
export {
  limitless,
  createLimitless,
  buildApproveCall,
  LimitlessNotConfiguredError,
} from './limitless.js';
export type {
  BetParams,
  BetQuote,
  LimitlessConfig,
  LimitlessAdapter,
  LimitlessMarket,
  FindMarketParams,
} from './limitless.js';
export { uniswap, makeUniswap } from './uniswap.js';
export type { BuyParams, BuyQuote, UniswapDeps } from './uniswap.js';
export { fetchPythPriceUsd, PYTH_FEED_IDS } from './pyth.js';
export type { PythConfig, PythSupportedAsset } from './pyth.js';
export { onramp, createOnramp } from './onramp.js';
export type { OnrampParams, OnrampQuote, OnrampSession, OnrampConfig } from './onramp.js';
export { getPublicClient, type ViemClientConfig } from './viem.js';
export { fetchBalance, type BalanceSnapshot } from './balance.js';
export { emptyIndexer, type HistoryIndexer, type HistoryItem } from './history.js';
export { createBasescanIndexer, type BasescanConfig } from './basescan.js';
