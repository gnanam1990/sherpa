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
  | 'LP'
  | 'STAKE'
  | 'BRIDGE'
  | 'DEPOSIT'
  | 'BALANCE'
  | 'HISTORY'
  | 'DCA'
  | 'ALERT'
  | 'AUTO_REPAY'
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
