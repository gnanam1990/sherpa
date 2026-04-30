/**
 * @sherpa/tools — protocol adapters (M1 ownership).
 *
 * Every adapter exports `quote()`, `buildTx()`, `verify()` — names
 * non-negotiable per M1_BACKEND_PACK.
 */

export * from './types.js';
export { usdc } from './usdc.js';
export type { UsdcTransferParams, UsdcQuote } from './usdc.js';
export { limitless } from './limitless.js';
export type { BetParams, BetQuote } from './limitless.js';
export { getPublicClient, type ViemClientConfig } from './viem.js';
export { fetchBalance, type BalanceSnapshot } from './balance.js';
export { emptyIndexer, type HistoryIndexer, type HistoryItem } from './history.js';
export { createBasescanIndexer, type BasescanConfig } from './basescan.js';
