import type { Address } from './types.js';
import type { PendingTx, RingCheckResult, SafetyRing } from './types.js';
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
  /** Optional tx simulator. Defaults to always-ok. */
  simulate?: (tx: PendingTx) => Promise<boolean> | boolean;
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
      const ok = await deps.simulate(tx);
      if (!ok) throw new Error('simulation failed');
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
