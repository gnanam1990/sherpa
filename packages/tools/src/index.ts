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
  getSwapRouter,
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
export { aave, createAave, AaveNotConfiguredError, getAavePool, getAaveDataProvider } from './aave/index.js';
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
export {
  uniswapV3,
  createUniswapV3,
  getUniswapV3Router,
  getUniswapV3Quoter,
  UNISWAP_V3_ROUTERS,
  UNISWAP_V3_QUOTERS,
} from './uniswap-v3/index.js';
export type {
  UniswapV3Adapter,
  UniswapSwapParams,
  UniswapSwapQuote,
  UniswapV3Deps,
} from './uniswap-v3/index.js';
export {
  createSessionKey,
  validateSessionKeyConfig,
  buildSessionKeyCall,
  validateExecution,
} from './session-keys/index.js';
export type {
  SessionKeyConfig,
  SessionKeyPermission,
  SessionKeyDeployment,
  SessionKeyDeps,
} from './session-keys/index.js';
export { listStrategies, getStrategy, executeStrategy, validateStrategyParameters } from './strategies/index.js';
export type {
  StrategyMetadata,
  StrategyExecution,
  StrategyStepResult,
  StrategyDeps,
} from './strategies/index.js';
export { fetchPortfolio, fetchMultiChainPortfolio, aggregatePortfolio, calculatePnl } from './portfolio/index.js';
export type {
  PortfolioToken,
  PortfolioPosition,
  PortfolioSnapshot,
  PortfolioDeps,
} from './portfolio/index.js';
export {
  dispatchNotification,
  sendPushNotification,
  sendEmailNotification,
  sendFarcasterNotification,
  sendTelegramNotification,
} from './notifications/index.js';
export type {
  NotificationPayload,
  NotificationResult,
  ChannelConfig,
  NotificationDeps,
} from './notifications/index.js';
export { calculateFee, buildFeeTransfer, FEE_TAKER_ABI, FEE_TAKER_ADDRESSES } from './fee-taker/index.js';
export type { FeeConfig, FeeCalculation, FeeTransfer, FeeDeps } from './fee-taker/index.js';
export {
  GOVERNOR_ABI,
  listProposals,
  buildVoteCall,
  buildDelegateCall,
} from './governance/index.js';
export type {
  ProposalMetadata,
  VoteParams,
  DelegateParams,
  GovernanceDeps,
} from './governance/index.js';
export { getVolumeMetrics, getFeeMetrics, getUsageMetrics } from './analytics/index.js';
export type {
  AnalyticsQuery,
  VolumeMetrics,
  FeeMetrics,
  UsageMetrics,
  AnalyticsDeps,
} from './analytics/index.js';
export { evaluateCondition, executeAction, validateAutomation } from './automation/index.js';
export type { AutomationRule, Condition, Action, AutomationDeps } from './automation/index.js';
export { getProfile, getLeaderboard, startCopyTrade, stopCopyTrade, getCopyTradeStatus } from './social/index.js';
export type { SocialUser, CopyTradeSettings, SocialDeps } from './social/index.js';
export {
  createMultisig,
  getMultisigTransactions,
  buildSubmitCall,
  MULTISIG_ABI,
  detectHardwareWallets,
  connectLedger,
  connectTrezor,
} from './security/index.js';
export type {
  MultisigConfig,
  MultisigTransaction,
  HardwareWalletInfo,
  SecurityDeps,
} from './security/index.js';
export { SherpaClient, createSherpaClient } from './sdk/client.js';
export { generateApiKey, validateApiKey, hashApiKey, createApiKey } from './sdk/api-keys.js';
export { generateWebhookSecret, createWebhook, verifyWebhookSignature } from './sdk/webhooks.js';
export type {
  SherpaClientConfig,
  ParseRequest,
  ParseResponse,
  PlanRequest,
  PlanResponse,
  SdkDeps,
  ApiKey,
  WebhookConfig,
  Webhook,
} from './sdk/types.js';
export { findBestRoute, estimateCrossChainTime, orchestrate, validateOrchestration } from './cross-chain/index.js';
export type { CrossChainRoute, CrossChainStep, OrchestratedTx, CrossChainDeps } from './cross-chain/index.js';
export { MemoryStore, ConversationStore } from './ai-agent/index.js';
export type { MemoryEntry, ConversationMessage, AgentDeps } from './ai-agent/index.js';
export {
  FLASH_LOAN_ABI,
  buildFlashLoanCall,
  calculateFlashLoanFee,
  calculateLeverage,
  calculateLiquidationPrice,
  estimateLeverageRisk,
} from './composable/index.js';
export type {
  FlashLoanParams,
  LeverageParams,
  ComposedStrategy,
  StrategyStep,
  ComposableDeps,
} from './composable/index.js';
export {
  checkCompliance,
  isOFACSanctioned,
  validateTransactionAmount,
  DEFAULT_COMPLIANCE_CONFIG,
  isSanctioned,
  SANCTIONED_ADDRESSES,
} from './compliance/index.js';
export type {
  ComplianceCheck,
  ComplianceFlag,
  ComplianceConfig,
  ComplianceDeps,
} from './compliance/index.js';
export { assessPortfolioRisk, getExposureBreakdown, calculateRiskScore, suggestHedges } from './risk/index.js';
export type { PortfolioRisk, RiskFactor, ExposureBreakdown, RiskDeps, HedgeStrategy } from './risk/index.js';
