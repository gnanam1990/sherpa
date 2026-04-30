import { resolve, isResolved, type ResolverBackends } from '@sherpa/identity';
import { createInMemoryRateLimiter, type RateLimiter } from '@sherpa/memory';
import {
  checkRings,
  firstFailure,
  ringsOk,
  ALLOWED_CONTRACTS,
  type PendingTx,
} from '@sherpa/safety';
import { usdc } from '@sherpa/tools';
import type { ConfirmationCardProps, ExecutionStep, ParsedIntent } from './types.js';

export type ExecutorDeps = {
  backends?: ResolverBackends;
  rateLimiter?: RateLimiter;
  userKey?: string;
};

export type PlanResult = { ok: true; card: ConfirmationCardProps } | { ok: false; error: string };

const GAS_SPONSORED_DISPLAY = '$0.00 (sponsored ✓)';

/**
 * Turn a `ParsedIntent` into a user-facing `ConfirmationCardProps`. Runs
 * the full safety-ring chain (1, 2, 3, 4, 6) before returning — Ring 5
 * (audit log) and Ring 7 (user confirmation) are handled in `execute()` and
 * by the UI layer respectively.
 */
export async function plan(parsed: ParsedIntent, deps: ExecutorDeps = {}): Promise<PlanResult> {
  if (parsed.intent === 'SEND') {
    return planSend(parsed, deps);
  }
  if (parsed.intent === 'BALANCE') {
    return {
      ok: true,
      card: {
        intent: 'BALANCE',
        primary_action_label: 'Show balance',
        primary_amount_display: '—',
        steps: [],
        gas_display: GAS_SPONSORED_DISPLAY,
        warnings: [],
        estimated_completion_ms: 500,
      },
    };
  }
  if (parsed.intent === 'HISTORY') {
    return {
      ok: true,
      card: {
        intent: 'HISTORY',
        primary_action_label: 'Show history',
        primary_amount_display: `last ${String(parsed.slots.limit ?? 10)}`,
        steps: [],
        gas_display: GAS_SPONSORED_DISPLAY,
        warnings: [],
        estimated_completion_ms: 500,
      },
    };
  }

  return { ok: false, error: `intent ${parsed.intent} not supported in Stage 1` };
}

async function planSend(parsed: ParsedIntent, deps: ExecutorDeps): Promise<PlanResult> {
  const slots = parsed.slots;
  const amountStr = typeof slots.amount === 'string' ? slots.amount : '';
  const toInput = typeof slots.to === 'string' ? slots.to : '';
  const asset = typeof slots.asset === 'string' ? slots.asset : 'USDC';

  if (!amountStr || !toInput) {
    return { ok: false, error: 'missing slots: amount/to' };
  }
  if (asset !== 'USDC') {
    return { ok: false, error: `SEND asset ${asset} not supported in Stage 1 (USDC only)` };
  }

  const resolved = await resolve(toInput, deps.backends);
  if (!isResolved(resolved)) {
    return { ok: false, error: `could not resolve recipient "${toInput}" (${resolved.type})` };
  }

  const tx = await usdc.buildTx({ amount: amountStr, to: resolved.address });
  const verified = await usdc.verify(tx);
  if (!verified.ok) {
    return { ok: false, error: `tx verify failed: ${verified.reason}` };
  }
  const quote = await usdc.quote({ amount: amountStr, to: resolved.address });

  const pending: PendingTx = {
    to: tx.to,
    data: tx.data,
    value: tx.value,
    asset: ALLOWED_CONTRACTS.USDC,
    amount: quote.amountBaseUnits,
    recipientSource: resolved.source,
  };

  const rl = deps.rateLimiter ?? createInMemoryRateLimiter();
  const rings = await checkRings(pending, {
    userKey: deps.userKey ?? 'anon',
    checkRateLimit: async (key) => (await rl.check(key, 10, 60)).ok,
    simulate: () => true,
  });

  if (!ringsOk(rings)) {
    const fail = firstFailure(rings);
    const reason = fail && !fail.ok ? fail.reason : '';
    return { ok: false, error: `safety ${fail?.ring} failed: ${reason}` };
  }

  const step: ExecutionStep = {
    kind: 'transfer',
    to: tx.to,
    data: tx.data,
    value: tx.value,
    label: `Transfer ${amountStr} USDC to ${resolved.display}`,
  };

  return {
    ok: true,
    card: {
      intent: 'SEND',
      primary_action_label: 'Send',
      primary_amount_display: `${amountStr} USDC`,
      secondary_amount_display: quote.usdDisplay,
      recipient_display: resolved.display,
      recipient_metadata: { source: resolved.source, ...(resolved.metadata ?? {}) },
      steps: [step],
      gas_display: GAS_SPONSORED_DISPLAY,
      warnings: [],
      estimated_completion_ms: 4_000,
    },
  };
}
