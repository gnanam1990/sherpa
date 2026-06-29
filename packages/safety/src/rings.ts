/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import type { Address } from './types.js';
import type { PendingTx, RingCheckResult, SafetyRing, SimulationCheckResult } from './types.js';
import { assertAllowlisted, ALLOWED_CONTRACTS } from './allowlist.js';
import { assertAmountCap, DEFAULT_CAPS } from './caps.js';
import { isSanctioned, hasRealSanctionsSource } from './sanctions.js';

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
  /** Whether the current chain is mainnet. Required for fail-safe policies. */
  isMainnet?: boolean;
  /**
   * Optional audit logging callback for Ring 5. Called when the ring
   * check passes to record the event for compliance.
   */
  logAudit?: (entry: {
    userAddress?: Address;
    intent?: string;
    to: Address;
    amount?: string;
    timestamp: number;
  }) => Promise<void> | void;
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

  // Pre-ring: OFAC sanctions check
  if (isSanctioned(tx.to)) {
    return [{ ok: false, ring: 'ring0_sanctions', reason: 'Recipient address is sanctioned (OFAC)' }];
  }
  if (tx.sender && isSanctioned(tx.sender)) {
    return [{ ok: false, ring: 'ring0_sanctions', reason: 'Sender address is sanctioned (OFAC)' }];
  }

  results.push(
    await runOne('ring1_allowlist', () =>
      assertAllowlisted(tx.to, deps.extraAllowlistedAddresses ?? []),
    ),
  );
  results.push(
    await runOne('ring2_amount_cap', () => {
      const result = assertAmountCap(tx.asset, tx.amount, DEFAULT_CAPS, deps.userKey);
      if (!result.ok) throw new Error(result.error);
    }),
  );
  results.push(
    await runOne('ring3_rate_limit', async () => {
      if (deps.checkRateLimit) {
        const ok = await deps.checkRateLimit(deps.userKey ?? 'anon');
        if (!ok) throw new Error('rate limit exceeded');
      } else {
        // On mainnet, rate limiting is required
        if (deps.isMainnet) {
          throw new Error('Rate limiting is required on mainnet');
        }
        // On testnet, allow pass-through (development convenience)
      }
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
    await runOne('ring5_audit_log', async () => {
      if (deps.logAudit) {
        await deps.logAudit({
          userAddress: tx.sender,
          intent: tx.data?.slice(0, 10),
          to: tx.to,
          amount: tx.amount.toString(),
          timestamp: Date.now(),
        });
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

/**
 * Validate mainnet-specific safety invariants.
 *
 * On mainnet the protocol MUST have fees enabled, a treasury address set,
 * simulation fail-closed, and a real OFAC sanctions list loaded. These checks
 * are no-ops on Sepolia.
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
    // Honesty gate: refuse to operate on mainnet unless a real OFAC sanctions
    // source is loaded (not the historical 2-3 address stub).
    if (!hasRealSanctionsSource()) {
      errors.push(
        'Real OFAC sanctions list required on mainnet (loaded list looks like a stub)',
      );
    }
  }

  return { ok: errors.length === 0, errors };
}
