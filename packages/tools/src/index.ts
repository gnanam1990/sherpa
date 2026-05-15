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
  searchMarkets,
  buildBuyOrderCall,
} from './limitless/index.js';
export type {
  BetParams,
  BetQuote,
  LimitlessConfig,
  LimitlessAdapter,
  LimitlessMarket,
  FindMarketParams,
  LimitlessSearchParams,
  LimitlessOrderParams,
  LimitlessDeps,
} from './limitless/index.js';
export { uniswap, makeUniswap } from './uniswap.js';
export type { BuyParams, BuyQuote, UniswapDeps } from './uniswap.js';
export { fetchPythPriceUsd, PYTH_FEED_IDS } from './pyth.js';
export type { PythConfig, PythSupportedAsset } from './pyth.js';
export {
  aerodrome,
  createAerodrome,
  AerodromeNotConfiguredError,
  PoolNotFoundError,
  TokenNotFoundError,
  quote as aerodromeQuote,
  buildSwapCall,
  verifySwap,
  SWAP_EXACT_TOKENS_SELECTOR,
} from './aerodrome/index.js';
export type {
  AerodromeAdapter,
  AerodromeDeps,
  SwapParams,
  SwapQuote,
  SwapAsset,
  AerodromeQuote,
  AerodromeRoute,
} from './aerodrome/index.js';
export { morpho, createMorpho, MorphoNotConfiguredError } from './morpho.js';
export type {
  MorphoAdapter,
  MorphoConfig,
  MorphoLendParams,
  MorphoLendQuote,
  MorphoMarketParams,
  LendAction,
} from './morpho.js';
export { aave, createAave, AaveNotConfiguredError } from './aave/index.js';
export type { AaveAdapter, AaveConfig, AaveLendParams, AaveLendQuote, AaveLendAction } from './aave/index.js';
export { buildBorrowCall, buildRepayCall } from './aave/index.js';
export { computeHealthFactor, computePostBorrowHealthFactor, healthFactorToBps, healthFactorRiskLevel } from './aave/index.js';
export type { AaveBorrowParams, AaveBorrowQuote, BorrowSimulation, UserAccountData } from './aave/index.js';
export { onramp, createOnramp } from './onramp.js';
export type { OnrampParams, OnrampQuote, OnrampSession, OnrampConfig } from './onramp.js';
export { getPublicClient, type ViemClientConfig } from './viem.js';
export { fetchBalance, type BalanceSnapshot } from './balance.js';
export { emptyIndexer, type HistoryIndexer, type HistoryItem } from './history.js';
export { createBasescanIndexer, type BasescanConfig } from './basescan.js';
export { createSimulator, type Simulator, type SimulatorCall, type TenderlyConfig, type SimulationResult, type SimulationErrorCode } from './simulator/tenderly.js';
export { resolveToken, allTokens, getTokensForChain, type TokenInfo } from './registry.js';
export { across, createAcross, getBridgeQuote, buildBridgeCall, SUPPORTED_CHAINS } from './across/index.js';
export type { AcrossAdapter, BridgeParams, BridgeQuote, BridgeCallResult } from './across/index.js';
export { lido, createLido, LidoNotConfiguredError } from './lido/index.js';
export type { LidoAdapter, LidoConfig, LidoStakeParams, LidoStakeQuote } from './lido/index.js';
export { searchMarkets as searchPolyForgeMarkets, PolyForgeNotConfiguredError, buildPolyForgeOrder } from './polyforge/index.js';
export type { PolyForgeMarket, PolyForgeSearchParams, PolyForgeDeps } from './polyforge/index.js';
export { getPrice, getBalance, getHealthFactor } from './oracles/index.js';
export type { PriceOracleConfig, BalanceOracleConfig, AavePositionConfig } from './oracles/index.js';
export { buildTipCall, resolveFarcasterAddress, buildPollCast } from './farcaster/index.js';
export type { TipParams, TipQuote, NeynarDeps, ResolvedFarcasterUser, PollParams } from './farcaster/index.js';
export { ZoraNotConfiguredError, resolveCollection, searchCollections, buildMintCall } from './zora/index.js';
export type { ZoraCollection, ZoraMintParams, ZoraMintQuote, ZoraDeps } from './zora/index.js';
