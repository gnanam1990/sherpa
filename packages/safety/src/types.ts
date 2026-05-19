/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

/** 0x-prefixed hex address (20-byte). */
export type Address = `0x${string}`;

/** The seven safety rings, checked in order per M1_BACKEND_PACK. */
export type SafetyRing =
  | 'ring0_sanctions'
  | 'ring1_allowlist'
  | 'ring2_amount_cap'
  | 'ring3_rate_limit'
  | 'ring4_recipient'
  | 'ring5_audit_log'
  | 'ring6_simulation'
  | 'ring7_user_confirmation';

export type RingCheckResult =
  | { ok: true; ring: SafetyRing }
  | { ok: false; ring: SafetyRing; reason: string };

export type AmountCap = {
  asset: Address | 'native';
  /** Cap in the asset's smallest unit (wei / base units). */
  maxPerTx: bigint;
  maxPerDay: bigint;
};

export type RateLimitConfig = {
  key: string;
  limit: number;
  windowSec: number;
};

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

/** Minimum tx shape safety needs to vet. */
export type PendingTx = {
  to: Address;
  data: `0x${string}`;
  value: bigint;
  /** Semantic asset + amount the executor extracted (for amount caps). */
  asset: Address | 'native';
  amount: bigint;
  /** Recipient resolution source; must not be `'llm'`. */
  recipientSource: 'farcaster' | 'basename' | 'ens' | 'direct';
  /** Sender address for audit logging and per-day cap tracking. */
  sender?: Address;
};

/**
 * Minimal simulation result for Ring 6. Mirrors `SimulationResult` from
 * `@sherpa/core` but defined here to avoid a circular dependency (safety
 * cannot import from core). The full `SimulationResult` in core adds
 * `traces` and `simulatedAt` — those are enrichments the executor uses
 * downstream; Ring 6 only needs the pass/fail + error code.
 */
export type SimulationCheckResult =
  | { ok: true; gasEstimate: bigint }
  | { ok: false; errorCode: string; errorMessage: string };

export type BorrowRiskBadge = {
  type: string;
  severity: 'red' | 'yellow' | 'green';
  message: string;
};

// ── Stage 2 Safety Ring Types ────────────────────────────────────────────

export type IntentType = 'SwapIntent' | 'BorrowIntent' | 'WithdrawIntent' | 'SendIntent';

export type HealthFactorWarning = {
  level: 'caution' | 'risky' | 'dangerous';
  message: string;
};

export type HealthFactorResult = {
  pass: boolean;
  currentHF: bigint;
  postHF: bigint;
  blockReason?: string;
  warning?: HealthFactorWarning;
  severity?: 'info' | 'warning' | 'critical';
};

export type HealthFactorParams = {
  intent: 'borrow' | 'withdraw';
  currentHF: bigint;
  postHF: bigint;
  /** Optional borrow amount in wei for context in warnings. */
  borrowAmount?: bigint;
  /** Optional collateral value in wei. */
  collateralValue?: bigint;
};

export type SlippageWarning = {
  level: 'caution' | 'risky' | 'dangerous';
  message: string;
};

export type SlippageResult = {
  pass: boolean;
  priceImpactBps: number;
  slippageBps: number;
  blockReason?: string;
  warning?: SlippageWarning;
};

export type SlippageParams = {
  /** Price impact in basis points (e.g. 50 = 0.5%). */
  priceImpactBps: number;
  /** User-specified slippage tolerance in basis points. Undefined = use default. */
  slippageBps?: number;
  /** Swap input amount in wei (for context in warnings). */
  inputAmount?: bigint;
  /** Swap output amount in wei. */
  outputAmount?: bigint;
};

export type LiquidationWarning = {
  level: 'caution' | 'risky' | 'dangerous';
  message: string;
};

export type LiquidationResult = {
  liquidationPriceUSD: number;
  currentPriceUSD: number;
  bufferPercent: number;
  warning?: LiquidationWarning;
};

export type LiquidationParams = {
  /** Current collateral price in USD. */
  currentPriceUSD: number;
  /** Collateral amount in wei. */
  collateralAmount: bigint;
  /** Borrow amount in USD. */
  borrowAmountUSD: number;
  /** Liquidation threshold (e.g. 0.85 for 85%). */
  liquidationThreshold: number;
};
