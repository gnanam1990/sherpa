import type { Address } from './types.js';
import type { PendingTx, RingCheckResult, SafetyRing, SimulationCheckResult } from './types.js';
import { assertAllowlisted } from './allowlist.js';
import { assertAmountCap, DEFAULT_CAPS } from './caps.js';

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
