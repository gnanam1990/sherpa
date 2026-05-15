import type { SimulationErrorCode } from '@sherpa/core';

/**
 * Human-readable error messages for simulation error codes.
 *
 * Displayed on the confirmation card when simulation rejects a transaction.
 * Keep messages actionable — tell the user what to do, not just what happened.
 */
const ERROR_MESSAGES: Record<SimulationErrorCode, string> = {
  INSUFFICIENT_FUNDS_FOR_GAS:
    'Not enough Sepolia ETH for gas. Get some at faucet.quicknode.com/base-sepolia',
  SIMULATION_REVERT:
    'This transaction would fail. Try a smaller amount or different recipient.',
  TIMEOUT: 'Simulation took too long. Try again.',
  NETWORK_ERROR:
    "Couldn't reach simulation service. Proceeding without pre-check on Sepolia.",
  INVALID_USEROP: 'Transaction malformed. Please refresh and try again.',
};

/**
 * Map a SimulationErrorCode to a user-facing message.
 */
export function simulationErrorMessage(code: SimulationErrorCode): string {
  return ERROR_MESSAGES[code] ?? 'Unknown simulation error. Try again.';
}

/**
 * Map a full SimulationResult (failed) to a user-facing message.
 * Returns undefined if the result is ok (no error to display).
 */
export function formatSimulationError(result: {
  ok: boolean;
  errorCode?: SimulationErrorCode;
}): string | undefined {
  if (result.ok || !result.errorCode) return undefined;
  return simulationErrorMessage(result.errorCode);
}

// ── SWAP-specific error messages ───────────────────────────────────────

export const SWAP_ERRORS = {
  TOKEN_NOT_FOUND: (symbol: string) =>
    `Sherpa doesn't know about ${symbol} yet. Try USDC, ETH, or WETH.`,
  PRICE_IMPACT_HIGH: (impactPct: string) =>
    `This swap has high price impact (${impactPct}%). Reduce amount or try a different pair.`,
  POOL_NOT_FOUND: (from: string, to: string) =>
    `Aerodrome doesn't have a pool for ${from}/${to} on this network.`,
  NETWORK_NOT_SUPPORTED: () =>
    "SWAP isn't available on this network yet.",
  SLIPPAGE_TOO_LOW: () =>
    'Slippage must be at least 0.1%.',
  SLIPPAGE_HIGH: (pct: string) =>
    `High slippage tolerance (${pct}%). Price may move significantly.`,
} as const;

// ── LEND-specific error messages ───────────────────────────────────

export const LEND_ERRORS = {
  AAVE_NOT_CONFIGURED: () =>
    "LEND isn't available on this network yet. Try a different intent.",
  ASSET_NOT_SUPPORTED: (symbol: string) =>
    `Aave doesn't support ${symbol} on this network. Try USDC.`,
  INSUFFICIENT_BALANCE: (symbol: string) =>
    `You don't have enough ${symbol} to lend.`,
  AMOUNT_TOO_SMALL: () =>
    'Lend amount is very small. Minimum recommended is $0.10.',
} as const;

// ── BORROW-specific error messages ──────────────────────────────────

export const BORROW_ERRORS = {
  CANT_BORROW_NO_COLLATERAL: () =>
    'You need to LEND assets first to use them as collateral.',
  BORROW_HF_TOO_LOW: (hf: string) =>
    `This borrow would leave your health factor at ${hf}, which is too risky. Try borrowing less.`,
  AAVE_BORROW_NOT_AVAILABLE: () =>
    "BORROW isn't available on this network yet.",
  ASSET_NOT_BORROWABLE: (symbol: string) =>
    `Aave doesn't support borrowing ${symbol} on this network.`,
  TARGET_HF_UNACHIEVABLE: (target: string, min: string) =>
    `Can't achieve health factor ${target} — minimum possible is ${min}.`,
  INSUFFICIENT_COLLATERAL: () =>
    'Not enough collateral to borrow this amount.',
  BORROW_AMOUNT_TOO_SMALL: () =>
    'Borrow amount is very small. Minimum recommended is $0.10.',
} as const;

// ── Fee-specific error messages ──────────────────────────────────────

export const FEE_ERRORS = {
  FEE_TREASURY_NOT_SET: () => 'Fee treasury address not configured.',
  FEE_AMOUNT_ZERO: () => 'Fee amount is zero — skipping fee.',
} as const;

// ── Mainnet-specific error messages ──────────────────────────────────

export const MAINNET_ERRORS = {
  SIMULATION_REQUIRED: () => 'Simulation must pass on mainnet. Transaction rejected.',
  MAINNET_CONFIG_INCOMPLETE: () => 'Mainnet configuration incomplete. Missing required addresses.',
  MAINNET_FEE_REQUIRED: () => 'Protocol fee must be enabled on mainnet.',
} as const;

// ── BET-specific error messages ──────────────────────────────────────

// ── DCA-specific error messages ──────────────────────────────────────

export const DCA_ERRORS = {
  INVALID_FREQUENCY: () => 'DCA frequency must be daily, weekly, or monthly.',
  AMOUNT_TOO_SMALL: () => 'DCA amount is too small. Minimum is $1 per tick.',
  BUDGET_EXHAUSTED: () => 'DCA budget has been exhausted.',
  MAX_EXECUTIONS_REACHED: () => 'DCA has reached maximum executions.',
} as const;

export const BET_ERRORS = {
  MARKET_NOT_FOUND: () => "Couldn't find a market matching that question. Try being more specific.",
  MARKET_RESOLVED: () => 'This market has already resolved.',
  BET_AMOUNT_TOO_LARGE: () => 'Bet amount exceeds market liquidity. Try a smaller amount.',
  LIMITLESS_NOT_CONFIGURED: () => "BET isn't available on this network yet.",
} as const;

// ── ALERT-specific error messages ─────────────────────────────────────

export const ALERT_ERRORS = {
  INVALID_CONDITION: () => 'Invalid alert condition.',
  THRESHOLD_INVALID: () => 'Threshold value is invalid for this condition type.',
  ALERT_LIMIT_REACHED: () => 'Maximum number of alerts reached (50 per user).',
} as const;

// ── AUTO_REPAY-specific error messages ────────────────────────────────

export const AUTO_REPAY_ERRORS = {
  NO_BORROW_POSITION: () => 'You need an active Aave borrow position to set up auto-repay.',
  TRIGGER_HF_INVALID: () => 'Trigger HF must be less than your current health factor.',
  TARGET_HF_INVALID: () => 'Target HF must be between trigger HF and current HF.',
  MAX_REPAY_EXCEEDED: () => 'Max repay per execution exceeds your available balance.',
  AUTO_REPAY_NOT_AVAILABLE: () => "AUTO_REPAY isn't available on this network yet.",
} as const;

// ── TIP-specific error messages ──────────────────────────────────────

export const TIP_ERRORS = {
  RECIPIENT_NOT_FOUND: () => 'Could not find that Farcaster user.',
  RECIPIENT_NO_WALLET: () => "Recipient hasn't linked a wallet yet.",
  TIP_AMOUNT_TOO_LARGE: () => 'Tip amount exceeds maximum ($1000).',
} as const;

// ── POLL-specific error messages ─────────────────────────────────────

export const POLL_ERRORS = {
  NO_QUESTION: () => 'Poll question is required.',
  TOO_MANY_OPTIONS: () => 'Polls support a maximum of 8 options.',
} as const;

// ── COLLECT-specific error messages ───────────────────────────────────

export const COLLECT_ERRORS = {
  COLLECTION_NOT_FOUND: () => 'Could not find that Zora collection.',
  MINT_NOT_ACTIVE: () => 'This collection is not currently minting.',
  QUANTITY_EXCEEDED: () => 'Requested quantity exceeds maximum per transaction.',
  INSUFFICIENT_FUNDS: () => 'Not enough ETH to cover mint price + gas.',
} as const;

// ── TIME_LOCK-specific error messages ────────────────────────────────

export const TIME_LOCK_ERRORS = {
  INVALID_TIME: () => 'Scheduled time must be in the future.',
  MIN_DELAY_NOT_MET: () => 'Minimum delay not met.',
  ACTION_NOT_SUPPORTED: () => 'This action cannot be scheduled.',
  MAX_SCHEDULES_REACHED: () => 'Maximum number of scheduled actions reached (100).',
} as const;

// ── AUTO_REBALANCE-specific error messages ──────────────────────────────

export const AUTO_REBALANCE_ERRORS = {
  NO_PORTFOLIO: () => 'No portfolio data available for rebalancing.',
  DRIFT_TOO_LARGE: () => 'Portfolio drift exceeds maximum. Manual review required.',
  INSUFFICIENT_LIQUIDITY: () => 'Not enough liquidity to rebalance.',
  REBALANCE_FAILED: () => 'Rebalancing failed. Please try again.',
} as const;

// ── SESSION_KEY-specific error messages ──────────────────────────────────

export const SESSION_KEY_ERRORS = {
  SPEND_LIMIT_EXCEEDED: (limit: string) => `Session key spend limit ($${limit}) exceeded.`,
  SESSION_EXPIRED: () => 'Session key has expired.',
  SESSION_REVOKED: () => 'Session key has been revoked.',
  EXECUTION_LIMIT_REACHED: () => 'Maximum executions reached for this session key.',
  PERMISSION_DENIED: (target: string) => `Session key does not have permission for ${target}.`,
  INVALID_DURATION: () => 'Session duration must be between 1 minute and 30 days.',
  INVALID_SPEND_LIMIT: () => 'Spend limit must be positive.',
} as const;

// ── Multi-chain error messages ──────────────────────────────────────────

export const STRATEGY_ERRORS = {
  STRATEGY_NOT_FOUND: (id: string) => `Strategy ${id} not found.`,
  INVALID_PARAMETERS: () => 'Invalid strategy parameters.',
  TOO_MANY_STEPS: (max: number) => `Strategy exceeds maximum steps (${max}).`,
  UNSUPPORTED_INTENT: (intent: string) => `Strategy contains unsupported intent: ${intent}.`,
  ALREADY_FOLLOWING: () => 'You are already following this strategy.',
  STRATEGY_PRIVATE: () => 'This strategy is private.',
} as const;

// ── PORTFOLIO-specific error messages ─────────────────────────────────

export const PORTFOLIO_ERRORS = {
  ADDRESS_REQUIRED: () => 'Wallet address required to fetch portfolio.',
  CHAIN_NOT_SUPPORTED: (chain: string) => `Portfolio data not available for ${chain}.`,
  RPC_ERROR: (chain: string) => `Failed to fetch portfolio data for ${chain}.`,
  NO_POSITIONS: () => 'No positions found.',
} as const;

// ── NOTIFICATION-specific error messages ─────────────────────────────

export const NOTIFICATION_ERRORS = {
  CHANNEL_NOT_CONFIGURED: (channel: string) => `${channel} notifications are not configured.`,
  INVALID_CHANNEL: (channel: string) => `Unsupported notification channel: ${channel}.`,
  RATE_LIMITED: () => 'Too many notifications. Please wait before sending more.',
  DELIVERY_FAILED: (channel: string) => `Failed to deliver notification via ${channel}.`,
  SUBSCRIPTION_EXISTS: () => 'You are already subscribed to this notification.',
} as const;

// ── GOVERNANCE-specific error messages ────────────────────────────────

export const GOVERNANCE_ERRORS = {
  NO_VOTING_POWER: () => 'You do not have voting power. Delegate or acquire governance tokens first.',
  PROPOSAL_NOT_FOUND: (id: string) => `Proposal #${id} not found.`,
  PROPOSAL_NOT_ACTIVE: () => 'This proposal is not currently accepting votes.',
  ALREADY_VOTED: () => 'You have already voted on this proposal.',
  QUORUM_NOT_MET: () => 'Proposal did not meet quorum requirements.',
  INSUFFICIENT_TOKENS: () => 'Insufficient governance tokens to create a proposal.',
  INVALID_DELEGATEE: () => 'Invalid delegatee address.',
} as const;

export const CHAIN_ERRORS = {
  UNSUPPORTED_CHAIN: (chain: string) => `Chain ${chain} is not supported yet.`,
  CHAIN_MISMATCH: (expected: string, actual: string) =>
    `Expected ${expected} but connected to ${actual}.`,
  BRIDGE_NOT_SUPPORTED: (from: string, to: string) =>
    `Bridge from ${from} to ${to} is not supported.`,
  WRONG_CHAIN_FOR_INTENT: (intent: string, chain: string) =>
    `${intent} is not available on ${chain}.`,
} as const;

export const SECURITY_ERRORS = {
  MULTISIG_NOT_SETUP: () => 'Multi-sig wallet not set up. Run "setup multisig" first.',
  INSUFFICIENT_CONFIRMATIONS: (current: number, required: number) =>
    `Need ${required} confirmations, have ${current}.`,
  HARDWARE_WALLET_NOT_CONNECTED: () =>
    'Hardware wallet not connected. Please connect and unlock your device.',
  ADDRESS_NOT_WHITELISTED: (addr: string) => `${addr} is not in your whitelist.`,
  THRESHOLD_INVALID: () => 'Multi-sig threshold must be between 1 and number of signers.',
  DAILY_LIMIT_EXCEEDED: (limit: string) => `Daily spend limit ($${limit}) exceeded.`,
} as const;

// ── AI_AGENT-specific error messages ────────────────────────────────────

export const AI_AGENT_ERRORS = {
  MEMORY_NOT_FOUND: (query: string) => `No memories found matching "${query}".`,
  PLAN_FAILED: (reason: string) => `Failed to create plan: ${reason}`,
  INVALID_GOAL: () => 'Goal description is required for planning.',
  EXPLANATION_NOT_FOUND: (topic: string) => `No explanation available for "${topic}".`,
  CONTEXT_UNAVAILABLE: () => 'AI context is not available. Connect wallet first.',
} as const;

// ── COMPOSABLE-specific error messages ─────────────────────────────────

// ── RISK-specific error messages ─────────────────────────────────────

export const RISK_ERRORS = {
  NO_PORTFOLIO: () => 'No portfolio data available for risk assessment.',
  HIGH_RISK_BLOCKED: (risk: string) => `Operation blocked due to ${risk} risk.`,
  HEDGE_FAILED: (reason: string) => `Hedge operation failed: ${reason}`,
  EXPOSURE_LIMIT_EXCEEDED: (asset: string, limit: string) => `Exposure to ${asset} exceeds limit (${limit}%).`,
} as const;

export const COMPOSABLE_ERRORS = {
  FLASH_LOAN_REPAY_FAILED: () => 'Flash loan must be repaid in the same transaction.',
  LEVERAGE_TOO_HIGH: (max: number) => `Leverage ratio exceeds maximum (${max}x).`,
  LIQUIDATION_RISK: (hf: string) => `This operation would drop health factor to ${hf}. High liquidation risk.`,
  INVALID_COMPOSITION: () => 'Invalid strategy composition.',
  STEP_FAILED: (step: number) => `Strategy step ${step} failed.`,
} as const;
