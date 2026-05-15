import type { Address } from './types.js';
import type { PendingTx, RingCheckResult, SafetyRing, SimulationCheckResult } from './types.js';
import { assertAllowlisted, ALLOWED_CONTRACTS } from './allowlist.js';
import { assertAmountCap, DEFAULT_CAPS } from './caps.js';

const CHAIN_ALLOWLISTS: Record<number, Address[]> = {
  42161: [ // Arbitrum
    '0x794a61358D6845594F94dc1DB02A252b5b4814aD' as Address, // Aave V3 Pool
    '0xc873fEcbd354f5A56E00E710B90EF4201db2448d' as Address, // Camelot Router
  ],
  10: [ // Optimism
    '0x794a61358D6845594F94dc1DB02A252b5b4814aD' as Address, // Aave V3 Pool
    '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858' as Address, // Velodrome Router
  ],
};

export function getChainAllowlist(chainId: number): Set<string> {
  const base = new Set(
    Object.values(ALLOWED_CONTRACTS).map((addr) => addr.toLowerCase()),
  );

  const chainExtras = CHAIN_ALLOWLISTS[chainId];
  if (chainExtras) {
    for (const addr of chainExtras) {
      base.add(addr.toLowerCase());
    }
  }

  return base;
}

/**
 * Ring checker result envelope. The executor calls `checkRings` before
 * building a `ConfirmationCardProps` — if any ring fails, the tx never makes
 * it to the user.
 *
 * Rings 5 (audit log) and 7 (user confirmation) are side-effecting and
 * handled by the executor / API layer respectively. Rings 1, 2, 3, 4, 6 are
 * pure checks against a `PendingTx`.
 */

export type RingsDependencies = {
  /** Optional rate-limit hook. Defaults to always-ok for tests. */
  checkRateLimit?: (key: string) => Promise<boolean> | boolean;
  /**
   * Optional tx simulator for Ring 6. Returns SimulationCheckResult —
   * caller is responsible for fail-open/fail-closed policy.
   */
  simulate?: (tx: PendingTx) => Promise<SimulationCheckResult> | SimulationCheckResult;
  /** User id / session id used for rate-limit keying. */
  userKey?: string;
  /**
   * Caller-vouched extra addresses to accept in Ring 1.
   *
   * Used by adapters that have been constructed with an explicit address
   * the static allowlist does not yet know about (e.g. a
   * `createLimitless({ factoryAddress })` test adapter). Production code
   * paths should leave this empty.
   */
  extraAllowlistedAddresses?: readonly Address[];
};

async function runOne(ring: SafetyRing, fn: () => Promise<void> | void): Promise<RingCheckResult> {
  try {
    await fn();
    return { ok: true, ring };
  } catch (err) {
    return { ok: false, ring, reason: (err as Error).message };
  }
}

export async function checkRings(
  tx: PendingTx,
  deps: RingsDependencies = {},
): Promise<RingCheckResult[]> {
  const results: RingCheckResult[] = [];

  results.push(
    await runOne('ring1_allowlist', () =>
      assertAllowlisted(tx.to, deps.extraAllowlistedAddresses ?? []),
    ),
  );
  results.push(
    await runOne('ring2_amount_cap', () => assertAmountCap(tx.asset, tx.amount, DEFAULT_CAPS)),
  );
  results.push(
    await runOne('ring3_rate_limit', async () => {
      if (!deps.checkRateLimit) return;
      const ok = await deps.checkRateLimit(deps.userKey ?? 'anon');
      if (!ok) throw new Error('rate limit exceeded');
    }),
  );
  results.push(
    await runOne('ring4_recipient', () => {
      if (!['farcaster', 'basename', 'ens', 'direct'].includes(tx.recipientSource)) {
        throw new Error(`recipient source ${tx.recipientSource} not trusted`);
      }
    }),
  );
  results.push(
    await runOne('ring6_simulation', async () => {
      if (!deps.simulate) return;
      const sim = await deps.simulate(tx);
      if (!sim.ok) {
        throw new Error(`simulation failed: ${sim.errorMessage}`);
      }
    }),
  );

  return results;
}

export function ringsOk(results: readonly RingCheckResult[]): boolean {
  return results.every((r) => r.ok);
}

export function firstFailure(results: readonly RingCheckResult[]): RingCheckResult | undefined {
  return results.find((r) => !r.ok);
}

export function assessBorrowRisk(resultingHf: number): Array<{ type: string; severity: string; message: string }> {
  const badges: Array<{ type: string; severity: string; message: string }> = [];

  if (resultingHf < 1.1) {
    badges.push({
      type: 'HEALTH_FACTOR_DANGER',
      severity: 'red',
      message: `Health factor would drop to ${resultingHf.toFixed(2)}. Very high liquidation risk!`,
    });
  } else if (resultingHf < 1.5) {
    badges.push({
      type: 'HEALTH_FACTOR_WARNING',
      severity: 'yellow',
      message: `Health factor would be ${resultingHf.toFixed(2)}. Moderate liquidation risk.`,
    });
  }

  return badges;
}

export function checkBorrowCapacity(
  availableBorrows: bigint,
  borrowAmount: bigint,
): { ok: boolean; message?: string } {
  if (borrowAmount > availableBorrows) {
    return { ok: false, message: 'Borrow amount exceeds available capacity.' };
  }
  return { ok: true };
}

/**
 * Validate mainnet-specific safety invariants.
 *
 * On mainnet the protocol MUST have fees enabled, a treasury address set,
 * and simulation must be fail-closed. These checks are no-ops on Sepolia.
 */
export function assertMainnetSafety(config: {
  isMainnet: boolean;
  feeEnabled: boolean;
  treasuryAddress?: string;
  simulationFailOpen: boolean;
}): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.isMainnet) {
    if (!config.feeEnabled) errors.push('Protocol fee must be enabled on mainnet');
    if (!config.treasuryAddress) errors.push('Fee treasury address required on mainnet');
    if (config.simulationFailOpen) errors.push('Simulation must be fail-closed on mainnet');
  }

  return { ok: errors.length === 0, errors };
}

export function validateFeeTransfer(
  feeCall: { to: Address; value: bigint },
  expectedTreasury: Address,
  maxFeeBps: number,
  outputAmount: bigint,
): { ok: boolean; error?: string } {
  if (feeCall.to.toLowerCase() !== expectedTreasury.toLowerCase()) {
    return { ok: false, error: 'Fee transfer destination does not match treasury address.' };
  }

  const maxFee = (outputAmount * BigInt(maxFeeBps)) / 10000n;
  if (feeCall.value > maxFee) {
    return { ok: false, error: 'Fee amount exceeds configured maximum.' };
  }

  return { ok: true };
}

export function assessLPRisk(
  priceImpactBps: number,
  hasILWarning: boolean,
): Array<{ type: string; severity: string; message: string }> {
  const badges: Array<{ type: string; severity: string; message: string }> = [];

  if (priceImpactBps > 100) {
    badges.push({
      type: 'PRICE_IMPACT_HIGH',
      severity: 'red',
      message: `High price impact: ${(priceImpactBps / 100).toFixed(1)}%`,
    });
  }
  if (hasILWarning) {
    badges.push({
      type: 'IMPERMANENT_LOSS',
      severity: 'yellow',
      message: 'LP positions are subject to impermanent loss.',
    });
  }

  return badges;
}

export function assessBetRisk(
  market: { liquidity: bigint; status: string },
  amount: bigint,
): Array<{ type: string; severity: string; message: string }> {
  const badges: Array<{ type: string; severity: string; message: string }> = [];

  if (market.status === 'resolved') {
    badges.push({
      type: 'MARKET_RESOLVED',
      severity: 'red',
      message: 'This market has already resolved.',
    });
  }
  if (amount > market.liquidity / 10n) {
    badges.push({
      type: 'BET_AMOUNT_LARGE',
      severity: 'yellow',
      message: 'Bet amount is large relative to market liquidity.',
    });
  }

  return badges;
}

export function validateTimeLock(params: {
  scheduledTime: number;
  minDelay?: number;
}): { ok: boolean; error?: string } {
  const now = Math.floor(Date.now() / 1000);
  const minDelaySeconds = params.minDelay ?? 60; // 1 minute minimum

  if (params.scheduledTime <= now) {
    return { ok: false, error: 'Scheduled time must be in the future.' };
  }
  if (params.scheduledTime < now + minDelaySeconds) {
    return { ok: false, error: `Minimum delay is ${minDelaySeconds} seconds.` };
  }
  return { ok: true };
}

export function validateDCASchedule(params: {
  amountPerTick: bigint;
  totalBudget?: bigint;
  maxExecutions?: number;
}): { ok: boolean; error?: string } {
  if (params.amountPerTick <= 0n) {
    return { ok: false, error: 'DCA amount must be positive.' };
  }
  if (params.totalBudget && params.totalBudget < params.amountPerTick) {
    return { ok: false, error: 'Total budget is less than one tick.' };
  }
  if (params.maxExecutions && params.maxExecutions < 1) {
    return { ok: false, error: 'Max executions must be at least 1.' };
  }
  return { ok: true };
}

export function validateAlert(params: {
  conditionType: string;
  threshold: number;
  comparison: string;
}): { ok: boolean; error?: string } {
  if (params.conditionType === 'health-factor' && params.threshold < 1.0) {
    return { ok: false, error: 'Health factor threshold must be >= 1.0.' };
  }
  if (params.conditionType === 'price' && params.threshold <= 0) {
    return { ok: false, error: 'Price threshold must be positive.' };
  }
  return { ok: true };
}

export function validateAutoRepay(params: {
  triggerHF: number;
  targetHF: number;
  currentHF: number;
}): { ok: boolean; error?: string } {
  if (params.triggerHF >= params.currentHF) {
    return { ok: false, error: 'Trigger HF must be less than current HF.' };
  }
  if (params.targetHF <= params.triggerHF) {
    return { ok: false, error: 'Target HF must be greater than trigger HF.' };
  }
  if (params.targetHF > params.currentHF) {
    return { ok: false, error: 'Target HF cannot exceed current HF.' };
  }
  return { ok: true };
}

export function validateTip(params: {
  amount: bigint;
  recipientAddress?: `0x${string}`;
}): { ok: boolean; error?: string } {
  if (params.amount <= 0n) {
    return { ok: false, error: 'Tip amount must be positive.' };
  }
  const maxTip = 1000000000n; // $1000 USDC (6 decimals)
  if (params.amount > maxTip) {
    return { ok: false, error: 'Tip amount exceeds maximum ($1000).' };
  }
  return { ok: true };
}

export function validateBridgeChains(
  source: string,
  dest: string,
  supported: Record<string, number>,
): { ok: boolean; error?: string } {
  if (!supported[source]) return { ok: false, error: `Source chain ${source} not supported.` };
  if (!supported[dest]) return { ok: false, error: `Destination chain ${dest} not supported.` };
  if (source === dest) return { ok: false, error: 'Source and destination chains must be different.' };
  return { ok: true };
}

export function validateCollect(params: {
  quantity: number;
  maxPerTx?: number;
}): { ok: boolean; error?: string } {
  if (params.quantity < 1) {
    return { ok: false, error: 'Quantity must be at least 1.' };
  }
  const max = params.maxPerTx ?? 10;
  if (params.quantity > max) {
    return { ok: false, error: `Maximum ${max} per transaction.` };
  }
  return { ok: true };
}

export function validateSessionKey(params: {
  spendLimit: bigint;
  validDuration: number;
  permissions: Array<{ target: string }>;
}): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  const maxSpend = 10000000000n; // $10,000 USDC (6 decimals)
  if (params.spendLimit > maxSpend) {
    errors.push('Session key spend limit exceeds maximum ($10,000)');
  }

  const maxDuration = 30 * 24 * 60 * 60; // 30 days
  if (params.validDuration > maxDuration) {
    errors.push('Session key duration exceeds maximum (30 days)');
  }

  const maxPermissions = 10;
  if (params.permissions.length > maxPermissions) {
    errors.push('Too many permissions (max 10)');
  }

  return { ok: errors.length === 0, errors };
}

export function validateStrategy(params: {
  intents: Array<{ type: string }>;
  maxSteps?: number;
}): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  const maxSteps = params.maxSteps ?? 10;
  if (params.intents.length > maxSteps) {
    errors.push(`Strategy has too many steps (max ${maxSteps})`);
  }

  const allowedIntents = new Set(['SWAP', 'LEND', 'BORROW', 'DCA', 'ALERT', 'AUTO_REPAY']);
  for (const intent of params.intents) {
    if (!allowedIntents.has(intent.type)) {
      errors.push(`Strategy contains unsupported intent: ${intent.type}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function validateFeeAmount(
  feeAmount: bigint,
  maxFeeBps: number,
  outputAmount: bigint,
): { ok: boolean; error?: string } {
  const maxFee = (outputAmount * BigInt(maxFeeBps)) / 10000n;
  if (feeAmount > maxFee) {
    return { ok: false, error: `Fee exceeds maximum (${maxFeeBps} bps)` };
  }
  return { ok: true };
}

export function validateRebalance(params: {
  driftPercent: number;
  maxDrift?: number;
}): { ok: boolean; error?: string } {
  const max = params.maxDrift ?? 50;
  if (params.driftPercent > max) {
    return { ok: false, error: `Drift exceeds maximum (${max}%). Manual review required.` };
  }
  return { ok: true };
}

export function validateSecuritySettings(params: {
  threshold: number;
  signers: string[];
}): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  if (params.threshold < 1) {
    errors.push('Multi-sig threshold must be at least 1');
  }
  if (params.threshold > params.signers.length) {
    errors.push('Threshold cannot exceed number of signers');
  }
  if (params.signers.length > 10) {
    errors.push('Maximum 10 signers allowed');
  }

  return { ok: errors.length === 0, errors };
}

export function validateLeverage(params: {
  ratio: number;
  maxRatio?: number;
}): { ok: boolean; error?: string } {
  const max = params.maxRatio ?? 5;
  if (params.ratio < 1) {
    return { ok: false, error: 'Leverage ratio must be at least 1' };
  }
  if (params.ratio > max) {
    return { ok: false, error: `Leverage ratio exceeds maximum (${max}x)` };
  }
  return { ok: true };
}

export function validateFlashLoan(params: {
  amount: bigint;
  maxAmount?: bigint;
}): { ok: boolean; error?: string } {
  const max = params.maxAmount ?? 1000000000000n; // $1M default
  if (params.amount > max) {
    return { ok: false, error: 'Flash loan amount exceeds maximum' };
  }
  return { ok: true };
}

export function isWhitelisted(
  address: `0x${string}`,
  whitelist: Set<string>,
): boolean {
  return whitelist.has(address.toLowerCase());
}
