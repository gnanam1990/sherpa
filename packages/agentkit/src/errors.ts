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
