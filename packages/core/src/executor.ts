import { resolve, isResolved, type ResolverBackends } from '@sherpa/identity';
import { createInMemoryRateLimiter, type RateLimiter } from '@sherpa/memory';
import {
  ALLOWED_CONTRACTS,
  buildSendCallsParams,
  checkRings,
  firstFailure,
  isBatchSponsorable,
  ringsOk,
  type Address,
  type Call,
  type PendingTx,
} from '@sherpa/safety';
import {
  buildApproveCall,
  limitless as defaultLimitless,
  onramp,
  uniswap,
  usdc,
  type LimitlessAdapter,
} from '@sherpa/tools';
import type {
  ConfirmationCardProps,
  ExecutionStep,
  ParsedIntent,
  SendCallsEnvelope,
} from './types.js';

export type ExecutorDeps = {
  backends?: ResolverBackends;
  rateLimiter?: RateLimiter;
  userKey?: string;
  userAddress?: Address;
  chainId?: number;
  paymasterUrl?: string;
  /**
   * Override the default `limitless` tool adapter. Tests pass a
   * `createLimitless({ factoryAddress })` instance so the BET path runs
   * end-to-end without setting `LIMITLESS_FACTORY_ADDRESS` globally.
   */
  limitless?: LimitlessAdapter;
};

export type PlanResult = { ok: true; card: ConfirmationCardProps } | { ok: false; error: string };

const GAS_SPONSORED_DISPLAY = '$0.00 (sponsored ✓)';
const GAS_USER_PAYS = 'user pays';
const DEFAULT_CHAIN_ID = 84532;

function stepToCall(step: ExecutionStep): Call {
  return { to: step.to, data: step.data, value: step.value };
}

function envelopeFor(steps: ExecutionStep[], deps: ExecutorDeps): SendCallsEnvelope | undefined {
  if (steps.length === 0 || !deps.userAddress) return undefined;
  const params = buildSendCallsParams(steps.map(stepToCall), {
    chainId: deps.chainId ?? DEFAULT_CHAIN_ID,
    from: deps.userAddress,
    paymasterUrl: deps.paymasterUrl,
  });
  return {
    version: params.version,
    chainId: params.chainId,
    calls: params.calls.map((c) => ({ to: c.to, data: c.data, value: c.value })),
    capabilities: params.capabilities,
  };
}

function gasDisplay(steps: ExecutionStep[], deps: ExecutorDeps): string {
  if (!deps.paymasterUrl) return GAS_USER_PAYS;
  return isBatchSponsorable(steps.map(stepToCall)) ? GAS_SPONSORED_DISPLAY : GAS_USER_PAYS;
}

export async function plan(parsed: ParsedIntent, deps: ExecutorDeps = {}): Promise<PlanResult> {
  if (parsed.intent === 'SEND') return planSend(parsed, deps);
  if (parsed.intent === 'BET') return planBet(parsed, deps);
  if (parsed.intent === 'BUY') return planBuy(parsed, deps);
  if (parsed.intent === 'DEPOSIT') return planDeposit(parsed, deps);
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

async function planBet(parsed: ParsedIntent, deps: ExecutorDeps): Promise<PlanResult> {
  const lim = deps.limitless ?? defaultLimitless;
  if (!lim.factoryAddress) {
    return {
      ok: false,
      error:
        'Limitless Sepolia address not yet configured. BET is disabled until M1 wires the real CTFExchange address.',
    };
  }
  const slots = parsed.slots;
  const stakeStr =
    typeof slots.usd === 'string'
      ? slots.usd
      : typeof slots.amount === 'string'
        ? slots.amount
        : '';
  const predicate = typeof slots.predicate === 'string' ? slots.predicate : '';
  const explicitOutcome = typeof slots.outcome === 'string' ? slots.outcome.toUpperCase() : '';
  const marketId =
    typeof slots.marketId === 'string' && /^0x[a-fA-F0-9]{64}$/.test(slots.marketId)
      ? (slots.marketId as `0x${string}`)
      : (`0x${'0'.repeat(64)}` as `0x${string}`);
  if (!stakeStr) return { ok: false, error: 'missing slots: stake' };
  const outcomeWord = explicitOutcome || (/\byes\b/i.test(predicate) ? 'YES' : 'NO');
  const outcome: 0 | 1 = outcomeWord === 'YES' ? 1 : 0;

  const tx = await lim.buildTx({ stake: stakeStr, marketId, outcome });
  const verified = await lim.verify(tx);
  if (!verified.ok) return { ok: false, error: `tx verify failed: ${verified.reason}` };
  const quote = await lim.quote({ stake: stakeStr, marketId, outcome });

  const pending: PendingTx = {
    to: tx.to,
    data: tx.data,
    value: tx.value,
    asset: ALLOWED_CONTRACTS.USDC,
    amount: quote.stakeBaseUnits,
    recipientSource: 'direct',
  };
  const r = await runRings(pending, deps, [lim.factoryAddress]);
  if (!r.ok) return r;

  const approve = buildApproveCall(lim.factoryAddress, quote.stakeBaseUnits);
  const steps: ExecutionStep[] = [
    {
      kind: 'approve',
      to: approve.to,
      data: approve.data,
      value: approve.value,
      label: `Approve ${stakeStr} USDC for Limitless`,
    },
    {
      kind: 'bet',
      to: tx.to,
      data: tx.data,
      value: tx.value,
      label: `Bet ${stakeStr} USDC on ${outcomeWord}${predicate ? ` (${predicate})` : ''}`,
    },
  ];

  const warnings: string[] = [];
  if (marketId === `0x${'0'.repeat(64)}`) {
    warnings.push('marketId not provided — using placeholder');
  }

  return {
    ok: true,
    card: {
      intent: 'BET',
      primary_action_label: 'Place bet',
      primary_amount_display: `${stakeStr} USDC`,
      secondary_amount_display: `payout ≈ ${quote.odds}`,
      steps,
      batch: envelopeFor(steps, deps),
      gas_display: gasDisplay(steps, deps),
      warnings,
      estimated_completion_ms: 6_000,
    },
  };
}

async function planBuy(parsed: ParsedIntent, deps: ExecutorDeps): Promise<PlanResult> {
  const slots = parsed.slots;
  const usd = typeof slots.usd === 'string' ? slots.usd : '';
  const asset = (typeof slots.asset === 'string' ? slots.asset : '').toUpperCase();
  if (!usd) return { ok: false, error: 'missing slots: usd' };
  if (asset !== 'ETH') {
    return { ok: false, error: `BUY asset ${asset} not supported (Stage 1: ETH only)` };
  }
  if (!deps.userAddress) {
    return { ok: false, error: 'BUY requires userAddress (recipient of swapped ETH)' };
  }

  const params = { usd, asset: 'ETH' as const, recipient: deps.userAddress };
  const tx = await uniswap.buildTx(params);
  const verified = await uniswap.verify(tx);
  if (!verified.ok) return { ok: false, error: `tx verify failed: ${verified.reason}` };
  const quote = await uniswap.quote(params);

  const pending: PendingTx = {
    to: tx.to,
    data: tx.data,
    value: tx.value,
    asset: ALLOWED_CONTRACTS.USDC,
    amount: quote.amountInBaseUnits,
    recipientSource: 'direct',
  };
  const r = await runRings(pending, deps);
  if (!r.ok) return r;

  const approve = buildApproveCall(ALLOWED_CONTRACTS.UNISWAP_ROUTER, quote.amountInBaseUnits);
  const steps: ExecutionStep[] = [
    {
      kind: 'approve',
      to: approve.to,
      data: approve.data,
      value: approve.value,
      label: `Approve ${usd} USDC for Uniswap`,
    },
    {
      kind: 'swap',
      to: tx.to,
      data: tx.data,
      value: tx.value,
      label: `Swap ${usd} USDC → ETH`,
    },
  ];

  return {
    ok: true,
    card: {
      intent: 'BUY',
      primary_action_label: 'Buy',
      primary_amount_display: `$${Number(usd).toFixed(2)}`,
      secondary_amount_display: quote.display,
      steps,
      batch: envelopeFor(steps, deps),
      gas_display: gasDisplay(steps, deps),
      warnings: [],
      estimated_completion_ms: 6_000,
    },
  };
}

async function planDeposit(parsed: ParsedIntent, deps: ExecutorDeps): Promise<PlanResult> {
  const slots = parsed.slots;
  const usd =
    typeof slots.usd === 'string'
      ? slots.usd
      : typeof slots.amount === 'string'
        ? slots.amount
        : '';
  if (!usd) return { ok: false, error: 'missing slots: usd' };
  if (!deps.userAddress) {
    return { ok: false, error: 'DEPOSIT requires userAddress (destination wallet)' };
  }
  const session = await onramp.buildSession({
    usd,
    destination: deps.userAddress,
    asset: 'USDC',
  });
  const quote = await onramp.quote({ usd, destination: deps.userAddress, asset: 'USDC' });
  return {
    ok: true,
    card: {
      intent: 'DEPOSIT',
      primary_action_label: session.live ? 'Open Coinbase Onramp' : 'Open Onramp (sandbox)',
      primary_amount_display: `$${Number(usd).toFixed(2)}`,
      secondary_amount_display: `≈ ${quote.netDisplay} (${quote.feeUsd} fee)`,
      steps: [],
      redirect_url: session.url,
      gas_display: 'n/a — fiat on-ramp',
      warnings: session.live ? [] : ['Coinbase Onramp does not run on testnets — sandbox URL'],
      estimated_completion_ms: 60_000,
    },
  };
}

async function planSend(parsed: ParsedIntent, deps: ExecutorDeps): Promise<PlanResult> {
  const slots = parsed.slots;
  const amountStr = typeof slots.amount === 'string' ? slots.amount : '';
  const toInput = typeof slots.to === 'string' ? slots.to : '';
  const asset = typeof slots.asset === 'string' ? slots.asset : 'USDC';

  if (!amountStr || !toInput) return { ok: false, error: 'missing slots: amount/to' };
  if (asset !== 'USDC') {
    return { ok: false, error: `SEND asset ${asset} not supported in Stage 1 (USDC only)` };
  }

  const resolved = await resolve(toInput, deps.backends);
  if (!isResolved(resolved)) {
    return { ok: false, error: `could not resolve recipient "${toInput}" (${resolved.type})` };
  }

  const tx = await usdc.buildTx({ amount: amountStr, to: resolved.address });
  const verified = await usdc.verify(tx);
  if (!verified.ok) return { ok: false, error: `tx verify failed: ${verified.reason}` };
  const quote = await usdc.quote({ amount: amountStr, to: resolved.address });

  const pending: PendingTx = {
    to: tx.to,
    data: tx.data,
    value: tx.value,
    asset: ALLOWED_CONTRACTS.USDC,
    amount: quote.amountBaseUnits,
    recipientSource: resolved.source,
  };
  const r = await runRings(pending, deps);
  if (!r.ok) return r;

  const steps: ExecutionStep[] = [
    {
      kind: 'transfer',
      to: tx.to,
      data: tx.data,
      value: tx.value,
      label: `Transfer ${amountStr} USDC to ${resolved.display}`,
    },
  ];

  return {
    ok: true,
    card: {
      intent: 'SEND',
      primary_action_label: 'Send',
      primary_amount_display: `${amountStr} USDC`,
      secondary_amount_display: quote.usdDisplay,
      recipient_display: resolved.display,
      recipient_metadata: { source: resolved.source, ...(resolved.metadata ?? {}) },
      steps,
      batch: envelopeFor(steps, deps),
      gas_display: gasDisplay(steps, deps),
      warnings: [],
      estimated_completion_ms: 4_000,
    },
  };
}

async function runRings(
  pending: PendingTx,
  deps: ExecutorDeps,
  extraAllowlistedAddresses: readonly Address[] = [],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rl = deps.rateLimiter ?? createInMemoryRateLimiter();
  const rings = await checkRings(pending, {
    userKey: deps.userKey ?? 'anon',
    checkRateLimit: async (key) => (await rl.check(key, 10, 60)).ok,
    simulate: () => true,
    extraAllowlistedAddresses,
  });
  if (!ringsOk(rings)) {
    const fail = firstFailure(rings);
    const reason = fail && !fail.ok ? fail.reason : '';
    return { ok: false, error: `safety ${fail?.ring} failed: ${reason}` };
  }
  return { ok: true };
}
