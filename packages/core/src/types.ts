import type { Address } from '@sherpa/safety';
import type { TokenInfo } from '@sherpa/tools';

/** Stage-1+ supported intents. Keep in sync with the parser. */
export type Intent =
  | 'SEND'
  | 'BUY'
  | 'BET'
  | 'SWAP'
  | 'LEND'
  | 'BORROW'
  | 'REPAY'
  | 'WITHDRAW'
  | 'POSITIONS'
  | 'LP'
  | 'STAKE'
  | 'BRIDGE'
  | 'DEPOSIT'
  | 'BALANCE'
  | 'HISTORY'
  | 'IDENTITY_LOOKUP'
  | 'DCA'
  | 'DCA_MANAGE'
  | 'ALERT'
  | 'AUTO_REPAY'
  | 'POLL'
  | 'TIP'
  | 'COLLECT'
  | 'TIME_LOCK'
  | 'AUTO_REBALANCE'
  | 'SESSION_KEY'
  | 'STRATEGY'
  | 'PORTFOLIO'
  | 'NOTIFICATION'
  | 'GOVERNANCE'
  | 'ANALYTICS'
  | 'SOCIAL'
  | 'AUTOMATION'
  | 'SECURITY'
  | 'DEVELOPER'
  | 'CROSS_CHAIN'
  | 'AI_AGENT'
  | 'COMPOSABLE'
  | 'RISK'
  | 'UNKNOWN';

export type ParsedIntent = {
  intent: Intent;
  confidence: number;
  raw: string;
  slots: Record<string, unknown>;
};

export type ExecutionStep = {
  kind: 'approve' | 'swap' | 'transfer' | 'bet' | 'custom';
  to: Address;
  data: `0x${string}`;
  value: bigint;
  /** Human-readable label rendered in the confirmation card. */
  label: string;
};

export type ExecutionPlan = {
  steps: ExecutionStep[];
  estimatedCompletionMs: number;
};

/**
 * EIP-5792 `wallet_sendCalls` envelope. Surfaced on the confirmation card
 * for the frontend; null when the plan is a single non-batched step (e.g.
 * pure SEND that the wallet can submit directly).
 */
export type SendCallsEnvelope = {
  version: '1.0';
  chainId: `0x${string}`;
  calls: Array<{ to: Address; data: `0x${string}`; value: `0x${string}` }>;
  capabilities?: { paymasterService?: { url: string } };
};

export type RiskIndicator =
  | string
  | { level?: 'info' | 'warning' | 'danger'; label: string; detail?: string };

/**
 * Contract with M2 (frontend). The executor produces this shape; the UI
 * renders it. Never break without 24h notice — see M1_BACKEND_PACK §3.
 */
export type ConfirmationCardProps = {
  intent: Intent;
  primary_action_label: string;
  primary_amount_display: string;
  secondary_amount_display?: string;
  recipient_display?: string;
  recipient_metadata?: Record<string, unknown>;
  /** Optional risk indicators rendered by M2 when M3/safety provides them. */
  risk_indicators?: RiskIndicator[];
  steps: ExecutionStep[];
  /** Sponsored EIP-5792 batch the frontend should submit (when steps.length > 0). */
  batch?: SendCallsEnvelope;
  /** External redirect (e.g. Coinbase Onramp URL) for off-chain actions. */
  redirect_url?: string;
  gas_display: string;
  warnings: string[];
  estimated_completion_ms: number;
  /** Protocol fee in basis points (e.g. 10 = 0.1%). Absent when fee is disabled. */
  protocolFeeBps?: number;
  /** Protocol fee amount in base units of feeAsset. */
  protocolFeeAmount?: bigint;
  /** Token the fee is charged in (e.g. 'USDC'). */
  feeAsset?: string;
  /** Alert configuration (ALERT intent only). */
  alert?: {
    conditionType: string;
    asset: string;
    comparison: string;
    threshold: number;
    notificationChannels: string[];
  };
  /** Auto-repay configuration (AUTO_REPAY intent only). */
  autoRepay?: {
    triggerHF: number;
    targetHF: number;
    maxRepayPerExecution?: string;
    repaySource: string[];
  };
};

export type ParseResponse = {
  parsed: ParsedIntent;
  card?: ConfirmationCardProps;
  error?: string;
};

export type ExecuteResponse =
  | { ok: true; auditLogId: number; planHash: string }
  | { ok: false; error: string };

// ── Simulation types (Stage 2 — Tenderly) ──────────────────────────────

export type SimulationErrorCode =
  | 'INSUFFICIENT_FUNDS_FOR_GAS'
  | 'SIMULATION_REVERT'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'INVALID_USEROP';

export type SimulationTrace = {
  readonly op: string;
  readonly address: string;
  readonly value?: string;
  readonly gasUsed?: string;
};

export type SimulationResult =
  | {
      ok: true;
      gasEstimate: bigint;
      traces?: SimulationTrace[];
      simulatedAt: number;
    }
  | {
      ok: false;
      errorCode: SimulationErrorCode;
      errorMessage: string;
    };

// ── Swap types (Stage 2 — Aerodrome) ──────────────────────────────────

export type SwapRoute = {
  provider: 'aerodrome';
  /** Direct or multi-hop pool path. Single-hop = 1 entry. */
  pools: Array<{ address: Address; stable: boolean }>;
  /** true for stable-stable pools (USDC/USDT), false for volatile (USDC/ETH). */
  stable: boolean;
};

export type SwapPlan = {
  type: 'SWAP';
  fromAsset: TokenInfo;
  toAsset: TokenInfo;
  /** Amount of fromAsset in base units (e.g. 100 USDC = 100_000_000n). */
  fromAmount: bigint;
  /** Minimum output after slippage (user receives at least this). */
  minOutAmount: bigint;
  /** Expected output before slippage. */
  expectedOutAmount: bigint;
  route: SwapRoute;
  /** Slippage tolerance in basis points (50 = 0.5%). */
  slippageBps: number;
  /** Price impact in basis points. Warning if > 100 (1%). */
  priceImpactBps: number;
  /** Unix-seconds deadline (typically now + 20min). */
  deadline: number;
  /** EIP-5792-ready call sequence: [approve?, swap]. */
  calls: Array<{ to: Address; data: `0x${string}`; value: bigint }>;
  protocolFeeBps: number;
  protocolFeeAmount: bigint;
  feeAsset?: TokenInfo;
};

export type FeeBreakdown = {
  feeBps: number;
  feeAmount: bigint;
  feeAsset: TokenInfo;
  treasuryAddress: `0x${string}`;
};

// ── Lend types (Stage 2 — Aave V3) ──────────────────────────────────

export type LendPlan = {
  type: 'LEND';
  asset: TokenInfo;
  /** Amount in base units (e.g. 100 USDC = 100_000_000n). */
  amount: bigint;
  /** Current supply APY in basis points. */
  supplyApyBps: number;
  /** Aave V3 default variable rate. */
  interestMode: 'variable';
  /** Target Aave Pool contract. */
  pool: { address: Address; chainId: number };
  /** Unix-seconds deadline. */
  deadline: number;
  /** EIP-5792-ready call sequence: [approve?, supply]. */
  calls: Array<{ to: Address; data: `0x${string}`; value: bigint }>;
};

// ── Borrow types (Stage 2 — Aave V3) ─────────────────────────────────

export type RiskBadge = {
  type: 'HEALTH_FACTOR_DANGER' | 'HEALTH_FACTOR_WARNING' | 'LIQUIDATION_RISK_NEAR_TERM' | 'HIGH_BORROW_UTILIZATION' | 'PRICE_IMPACT_HIGH';
  severity: 'red' | 'yellow' | 'orange';
  message: string;
};

export type BorrowPlan = {
  type: 'BORROW';
  borrowAsset: TokenInfo;
  borrowAmount: bigint;
  borrowApyBps: number;
  interestMode: 'variable' | 'stable';
  collateralAsset?: TokenInfo;
  currentCollateralValueUsd: bigint;
  resultingHealthFactor: number;
  liquidationThresholdBps: number;
  pool: { address: Address; chainId: number };
  deadline: number;
  riskBadges: RiskBadge[];
  calls: Array<{ to: Address; data: `0x${string}`; value: bigint }>;
};

// ── Bridge types (Stage 2 — Across Protocol) ──────────────────────────

export type BridgePlan = {
  type: 'BRIDGE';
  asset: TokenInfo;
  amount: bigint;
  sourceChain: string;
  destinationChain: string;
  estimatedTime: number;
  relayerFee: bigint;
  minOutAmount: bigint;
  calls: Array<{ to: Address; data: `0x${string}`; value: bigint }>;
};

// ── LP types (Stage 2 — Aerodrome) ─────────────────────────────────

export type LPPlan = {
  type: 'LP';
  asset1: TokenInfo;
  amount1: bigint;
  asset2: TokenInfo;
  amount2: bigint;
  pool: { address: Address; stable: boolean };
  lpTokenAmount: bigint;
  priceImpactBps: number;
  impermanentLossWarning: boolean;
  deadline: number;
  calls: Array<{ to: Address; data: `0x${string}`; value: bigint }>;
};

// ── Stake types (Stage 2 — Lido) ─────────────────────────────────────

export type StakePlan = {
  type: 'STAKE';
  stakeAsset: TokenInfo;
  stakeAmount: bigint;
  receiveAsset: TokenInfo;
  pool: { address: Address; chainId: number };
  deadline: number;
  calls: Array<{ to: Address; data: `0x${string}`; value: bigint }>;
};

// ── Bet types (Stage 3 — Limitless / PolyForge) ──────────────────────

export type MarketInfo = {
  id: string;
  question: string;
  resolutionDate: string;
  yesPrice: number;
  noPrice: number;
  liquidity: bigint;
};

export type BetPlan = {
  type: 'BET';
  asset: TokenInfo;
  amount: bigint;
  market: MarketInfo;
  side: 'YES' | 'NO';
  expectedShares: bigint;
  pricePerShare: number;
  provider: 'limitless' | 'polyforge';
  deadline: number;
  calls: Array<{ to: Address; data: `0x${string}`; value: bigint }>;
};

// ── Tip types (Stage 3 — Farcaster Tipping) ──────────────────────────

export type TipPlan = {
  type: 'TIP';
  asset: TokenInfo;
  amount: bigint;
  recipient: {
    farcasterUsername: string;
    fid?: number;
    address?: `0x${string}`;
  };
  deadline: number;
  calls: Array<{ to: Address; data: `0x${string}`; value: bigint }>;
};

// ── DCA types (Stage 4 — Scheduled Buys) ─────────────────────────────

export type DCASchedule = {
  type: 'DCA';
  userAddress: `0x${string}`;
  fromAsset: TokenInfo;
  toAsset: TokenInfo;
  amountPerTick: bigint;
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number; // 0=Sun, 6=Sat
  dayOfMonth?: number; // 1-31
  hourOfDay: number; // 0-23 UTC
  status: 'active' | 'paused' | 'completed';
  totalBudget?: bigint;
  remainingBudget?: bigint;
  totalExecutions: number;
  maxExecutions?: number;
  createdAt: number;
  nextExecutionAt: number;
  lastExecutedAt?: number;
};

// ── Alert types (Stage 4 — Price/Balance/HF Alerts) ────────────────────

export type Alert = {
  id: string;
  userAddress: `0x${string}`;
  conditionType: 'price' | 'balance' | 'health-factor';
  asset?: TokenInfo;
  comparison: '<' | '>' | '<=' | '>=' | '==' | 'cross-above' | 'cross-below';
  threshold: bigint | number;
  thresholdAsset?: TokenInfo;
  notificationChannels: ('email' | 'push' | 'farcaster' | 'telegram')[];
  triggeredIntent?: string;
  status: 'active' | 'paused' | 'triggered' | 'completed';
  createdAt: number;
  lastEvaluatedAt?: number;
  triggeredAt?: number;
  triggerCount: number;
};

// ── Auto-Repay types (Stage 4 — Health Factor Protection) ──────────────

export type AutoRepayRule = {
  id: string;
  userAddress: `0x${string}`;
  triggerHF: number; // basis points (e.g., 12000 = 1.2x)
  targetHF: number; // basis points
  maxRepayPerExecution: bigint;
  repaySource: ('usdc' | 'sell-eth-then-usdc')[];
  status: 'active' | 'paused' | 'disabled';
  consecutiveFailures: number;
  totalRepayments: number;
  totalRepaidUsd: bigint;
  createdAt: number;
  lastEvaluatedAt?: number;
  lastTriggeredAt?: number;
  authorizationTxHash?: string;
};

// ── Poll types (Stage 3 — Farcaster) ──────────────────────────────────

export type PollPlan = {
  type: 'POLL';
  question: string;
  options: string[];
  duration?: number; // hours
  channelId?: string; // Farcaster channel
  // No on-chain calls — polls are off-chain Farcaster casts
  calls: []; // always empty
};

// ── Collect types (Stage 3 — Zora) ────────────────────────────────────

export type CollectPlan = {
  type: 'COLLECT';
  target: string; // Zora URL or collection address
  quantity: number;
  pricePerUnit: bigint;
  totalPrice: bigint;
  collection?: {
    address: `0x${string}`;
    name: string;
    chainId: number;
  };
  deadline: number;
  calls: Array<{ to: Address; data: `0x${string}`; value: bigint }>;
};

// ── Time Lock types (Stage 4 — Scheduled Execution) ────────────────────

export type TimeLockPlan = {
  type: 'TIME_LOCK';
  action: string;
  scheduledTime: number;
  asset?: TokenInfo;
  amount?: bigint;
  recipient?: `0x${string}`;
  recurring: boolean;
  calls: Array<{ to: Address; data: `0x${string}`; value: bigint }>;
};

// ── Auto-Rebalance types (Stage 4 — Portfolio Rebalancing) ──────────────

export type AutoRebalancePlan = {
  type: 'AUTO_REBALANCE';
  currentAllocation: Array<{ asset: TokenInfo; percent: number; value: bigint }>;
  targetAllocation: Array<{ asset: TokenInfo; percent: number }>;
  rebalanceActions: Array<{ from: string; to: string; amount: bigint }>;
  threshold: number;
  calls: Array<{ to: Address; data: `0x${string}`; value: bigint }>;
};

// ── Session Key types (Stage 5 — Gasless Automation) ──────────────────

export type SessionKey = {
  id: string;
  address: `0x${string}`;
  ownerAddress: `0x${string}`;
  chainId: number;
  permissions: SessionPermission[];
  spendLimit: bigint;
  spentAmount: bigint;
  validUntil: number;
  validAfter: number;
  maxExecutions: number;
  executionCount: number;
  status: 'active' | 'expired' | 'revoked' | 'exhausted';
  createdAt: number;
};

export type SessionPermission = {
  target: `0x${string}`;
  selector: `0x${string}`;
  maxValue: bigint;
};

export type SessionKeyPlan = {
  type: 'SESSION_KEY';
  action: 'create' | 'revoke' | 'extend';
  sessionKey?: SessionKey;
  permissions: SessionPermission[];
  spendLimit: bigint;
  validDuration: number;
  calls: Array<{ to: Address; data: `0x${string}`; value: bigint }>;
};

// ── Strategy types (Stage 5 — Strategy Marketplace) ────────────────────

export type Strategy = {
  id: string;
  name: string;
  description: string;
  creator: `0x${string}`;
  chainId: number;
  intents: StrategyIntent[];
  parameters: Record<string, StrategyParameter>;
  visibility: 'public' | 'private' | 'unlisted';
  version: number;
  followers: number;
  totalVolume: bigint;
  successRate: number; // 0-100
  createdAt: number;
  updatedAt: number;
};

export type StrategyIntent = {
  type: Intent;
  template: string; // e.g., "swap {{amount}} USDC for ETH"
  conditions?: StrategyCondition[];
};

export type StrategyCondition = {
  type: 'price' | 'balance' | 'time' | 'health_factor';
  operator: '>' | '<' | '>=' | '<=' | '==';
  value: string;
};

export type StrategyParameter = {
  name: string;
  type: 'number' | 'string' | 'token' | 'address';
  description: string;
  default?: string;
  required: boolean;
};

export type StrategyPlan = {
  type: 'STRATEGY';
  action: 'create' | 'follow' | 'run' | 'list';
  strategy?: Strategy;
  parameters?: Record<string, string>;
  calls: Array<{ to: Address; data: `0x${string}`; value: bigint }>;
};

// ── Portfolio types (Stage 6 — Portfolio Dashboard) ──────────────────

export type Portfolio = {
  address: `0x${string}`;
  chains: ChainPortfolio[];
  totalValueUsd: bigint;
  totalPnlUsd: bigint;
  totalPnlPercent: number;
  lastUpdated: number;
};

export type ChainPortfolio = {
  chainId: number;
  chainName: string;
  tokens: TokenBalance[];
  totalValueUsd: bigint;
};

export type TokenBalance = {
  token: TokenInfo;
  balance: bigint;
  balanceUsd: bigint;
  priceUsd: number;
  pnlUsd: bigint;
  pnlPercent: number;
};

export type PortfolioPlan = {
  type: 'PORTFOLIO';
  action: 'show' | 'pnl' | 'history';
  chain?: string;
  portfolio?: Portfolio;
  calls: []; // No on-chain calls — read-only
};

// ── Notification types (Stage 6 — Notification System) ──────────────

export type NotificationChannel = 'push' | 'web-push' | 'email' | 'farcaster' | 'telegram';

export type Notification = {
  id: string;
  userId: `0x${string}`;
  channel: NotificationChannel;
  title: string;
  body: string;
  data?: Record<string, string>;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentAt?: number;
  createdAt: number;
};

export type NotificationSubscription = {
  id: string;
  userId: `0x${string}`;
  channel: NotificationChannel;
  condition: string;
  enabled: boolean;
  lastTriggered?: number;
  triggerCount: number;
};

export type NotificationPlan = {
  type: 'NOTIFICATION';
  action: 'subscribe' | 'set_channel' | 'list' | 'send';
  channel?: NotificationChannel;
  condition?: string;
  notification?: Notification;
  calls: []; // No on-chain calls
};

// ── Governance types (Stage 7 — Governance) ──────────────────────────

export type Proposal = {
  id: string;
  title: string;
  description: string;
  proposer: `0x${string}`;
  status: 'pending' | 'active' | 'passed' | 'rejected' | 'executed';
  votesFor: bigint;
  votesAgainst: bigint;
  votesAbstain: bigint;
  quorum: bigint;
  startTime: number;
  endTime: number;
  executionTime?: number;
  actions: ProposalAction[];
};

export type ProposalAction = {
  target: `0x${string}`;
  value: bigint;
  signature: string;
  calldata: `0x${string}`;
};

export type Vote = {
  proposalId: string;
  voter: `0x${string}`;
  support: 'yes' | 'no' | 'abstain';
  weight: bigint;
  reason?: string;
  timestamp: number;
};

export type GovernancePlan = {
  type: 'GOVERNANCE';
  action: 'vote' | 'propose' | 'delegate' | 'list';
  proposal?: Proposal;
  vote?: Vote;
  delegatee?: `0x${string}`;
  calls: Array<{ to: Address; data: `0x${string}`; value: bigint }>;
};

// ── Analytics types (Stage 7 — Analytics Dashboard) ────────────────────

export type AnalyticsData = {
  userId: `0x${string}`;
  period: 'day' | 'week' | 'month' | 'all';
  totalVolume: bigint;
  totalFees: bigint;
  totalTransactions: number;
  intentsBreakdown: Record<string, { count: number; volume: bigint }>;
  chainBreakdown: Record<number, { count: number; volume: bigint }>;
  topAssets: Array<{ symbol: string; volume: bigint; count: number }>;
  successRate: number;
};

export type AnalyticsPlan = {
  type: 'ANALYTICS';
  action: 'volume' | 'fees' | 'stats' | 'usage';
  period?: string;
  data?: AnalyticsData;
  calls: []; // Read-only, no on-chain calls
};

// ── Social types (Stage 7 — Social Features) ────────────────────────────

export type SocialProfile = {
  address: `0x${string}`;
  farcasterUsername?: string;
  fid?: number;
  followers: number;
  following: number;
  totalVolume: bigint;
  successRate: number;
  rank?: number;
};

export type CopyTradeConfig = {
  traderAddress: `0x${string}`;
  maxAmountPerTrade: bigint;
  maxDailyAmount: bigint;
  enabledIntents: Intent[];
  status: 'active' | 'paused';
};

export type SocialPlan = {
  type: 'SOCIAL';
  action: 'follow' | 'copy_trade' | 'leaderboard' | 'profile';
  target?: `0x${string}`;
  profile?: SocialProfile;
  calls: []; // No on-chain calls
};

// ── Automation types (Stage 7 — Advanced Automation) ───────────────────

export type Automation = {
  id: string;
  name: string;
  condition: AutomationCondition;
  action: AutomationAction;
  userId: `0x${string}`;
  status: 'active' | 'paused' | 'triggered' | 'failed';
  maxExecutions?: number;
  executionCount: number;
  lastTriggered?: number;
  createdAt: number;
};

export type AutomationCondition = {
  type: 'price' | 'balance' | 'health_factor' | 'time' | 'block';
  operator: '>' | '<' | '>=' | '<=' | '==' | 'crosses';
  value: string;
  asset?: string;
};

export type AutomationAction = {
  type: Intent;
  params: Record<string, string>;
};

export type AutomationPlan = {
  type: 'AUTOMATION';
  action: 'create' | 'list' | 'cancel';
  automation?: Automation;
  calls: Array<{ to: Address; data: `0x${string}`; value: bigint }>;
};

// ── Security types (Stage 8 — Security Hardening) ──────────────────────

export type SecuritySettings = {
  multisigEnabled: boolean;
  multisigThreshold: number;
  multisigSigners: `0x${string}`[];
  hardwareWalletConnected: boolean;
  hardwareWalletType?: 'ledger' | 'trezor';
  whitelistedAddresses: `0x${string}`[];
  dailySpendLimit: bigint;
  perTxSpendLimit: bigint;
  requireConfirmationAbove: bigint;
};

export type SecurityPlan = {
  type: 'SECURITY';
  action: 'multisig' | 'hardware' | 'status' | 'whitelist';
  settings?: SecuritySettings;
  target?: `0x${string}`;
  calls: Array<{ to: Address; data: `0x${string}`; value: bigint }>;
};

// ── Developer types (Stage 8 — Developer API) ─────────────────────────

export type ApiKey = {
  id: string;
  key: string;
  name: string;
  permissions: string[];
  rateLimit: number;
  usageCount: number;
  createdAt: number;
  expiresAt?: number;
};

export type Webhook = {
  id: string;
  url: string;
  events: string[];
  secret: string;
  status: 'active' | 'paused' | 'failed';
  lastTriggered?: number;
  failureCount: number;
};

export type DeveloperPlan = {
  type: 'DEVELOPER';
  action: 'create_key' | 'docs' | 'status' | 'webhook';
  apiKey?: ApiKey;
  webhook?: Webhook;
  calls: []; // No on-chain calls
};

// ── Cross-chain types (Stage 8 — Cross-chain Orchestration) ────────────

export type CrossChainIntent = {
  type: 'CROSS_CHAIN';
  sourceChain: string;
  destinationChain: string;
  bridgeAsset: string;
  bridgeAmount: bigint;
  followUpAction?: string;
  estimatedTime: number;
  bridgeFee: bigint;
  calls: Array<{ to: Address; data: `0x${string}`; value: bigint }>;
};

// ── AI Agent types (Stage 9 — AI Agent) ─────────────────────────────

export type AIMemory = {
  id: string;
  userId: `0x${string}`;
  content: string;
  category: 'preference' | 'fact' | 'goal' | 'risk' | 'strategy';
  importance: number; // 1-10
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
};

export type AIContext = {
  userId: `0x${string}`;
  memories: AIMemory[];
  recentIntents: Intent[];
  preferences: Record<string, string>;
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
  portfolioSummary?: {
    totalValue: bigint;
    chains: string[];
    topAssets: string[];
  };
};

export type AIPlan = {
  goal: string;
  steps: AIPlanStep[];
  estimatedTime: number;
  riskLevel: 'low' | 'medium' | 'high';
  prerequisites: string[];
};

export type AIPlanStep = {
  description: string;
  intent: Intent;
  params: Record<string, string>;
  dependencies: number[]; // indices of prerequisite steps
};

export type AIAgentPlan = {
  type: 'AI_AGENT';
  action: 'remember' | 'forget' | 'context' | 'plan' | 'explain';
  memory?: AIMemory;
  context?: AIContext;
  aiPlan?: AIPlan;
  explanation?: string;
  calls: []; // No on-chain calls
};

// ── Risk types (Stage 9 — Risk Management) ─────────────────────────

export type RiskAssessment = {
  overallRisk: 'low' | 'medium' | 'high' | 'extreme';
  riskScore: number; // 0-100
  factors: RiskFactor[];
  recommendations: string[];
};

export type RiskFactor = {
  type: 'concentration' | 'leverage' | 'liquidity' | 'smart_contract' | 'market' | 'protocol';
  severity: 'low' | 'medium' | 'high';
  description: string;
  impact: string;
};

export type RiskPlan = {
  type: 'RISK';
  action: 'check' | 'exposure' | 'hedge' | 'alert';
  assessment?: RiskAssessment;
  condition?: string;
  calls: []; // Read-only or hedge calls
};

// ── Composable types (Stage 9 — DeFi Composability) ─────────────────

export type ComposableStep = {
  intent: Intent;
  params: Record<string, string>;
  protocol: string;
  estimatedGas: bigint;
};

export type ComposableIntent = {
  type: 'COMPOSABLE';
  action: 'flash_loan' | 'leverage' | 'deleverage' | 'compose';
  steps: ComposableStep[];
  flashLoanAmount?: bigint;
  flashLoanAsset?: TokenInfo;
  leverageRatio?: number;
  totalGasEstimate: bigint;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  calls: Array<{ to: Address; data: `0x${string}`; value: bigint }>;
};
