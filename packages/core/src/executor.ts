import {
  resolve,
  isResolved,
  type IdentityResolver,
  type ResolverBackends,
} from '@sherpa/identity';
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
  type SimulationCheckResult,
} from '@sherpa/safety';
import {
  aave as defaultAave,
  buildApproveCall,
  buildBorrowCall,
  buildSherpaRouterBorrowPlan,
  buildSherpaRouterRepayPlan,
  buildSherpaRouterSupplyPlan,
  buildSherpaRouterSwapPlan,
  buildSherpaRouterWithdrawPlan,
  limitless as defaultLimitless,
  onramp,
  searchPolyForgeMarkets,
  buildPolyForgeOrder,
  uniswap as defaultUniswap,
  usdc,
  type AaveAdapter,
  type AaveBorrowParams,
  type AaveLendParams,
  type SherpaRouterReadContract,
  type LimitlessAdapter,
  type BuyParams,
  type BuyQuote,
} from '@sherpa/tools';
import type { ToolAdapter } from '@sherpa/tools';
import { resolveToken } from '@sherpa/tools';
import { buildSwapCall, verifySwap } from '@sherpa/tools';
import { encodeFunctionData, erc20Abi, parseUnits } from 'viem';
import type {
  ConfirmationCardProps,
  ExecutionStep,
  ParsedIntent,
  SendCallsEnvelope,
} from './types.js';

export type ExecutorDeps = {
  backends?: ResolverBackends;
  resolver?: IdentityResolver;
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
  /**
   * Override the default `uniswap` tool adapter. Useful in tests that want
   * to disable the Pyth tier (`makeUniswap({ pyth: false })`) so quotes
   * stay deterministic without a network call.
   */
  uniswap?: ToolAdapter<BuyParams, BuyQuote, BuyParams>;
  /** Override the default Aave adapter for LEND. */
  aave?: AaveAdapter;
  /** Explicit Aerodrome-compatible router address for testnet swap demos. */
  aerodromeRouterAddress?: Address;
  /** True only for Base Sepolia Stage 2 demos; applies small amount caps and warnings. */
  stage2Testnet?: boolean;
  /** True only for guarded Base mainnet Stage 2 beta. */
  stage2Mainnet?: boolean;
  /** Audited SherpaRouter address for mainnet Stage 2. */
  sherpaRouterAddress?: Address;
  /** Aerodrome factory used in Router swap routes. */
  aerodromeFactoryAddress?: Address;
  /** Base mainnet RPC used for Router quotes/reserve lookups. */
  stage2RpcUrl?: string;
  /** Test hook for Router quote/reserve reads. */
  stage2ReadContract?: SherpaRouterReadContract;
  /**
   * Optional simulation callback for Ring 6. When provided, the planner
   * runs simulation after building steps and rejects if the tx would fail.
   * Caller is responsible for fail-open/fail-closed policy.
   */
  simulate?: (tx: PendingTx) => Promise<SimulationCheckResult> | SimulationCheckResult;
  /** Whether protocol fee is enabled. */
  feeEnabled?: boolean;
  /** Protocol fee in basis points (e.g. 10 = 0.1%). */
  feeBps?: number;
  /** Treasury address to receive protocol fees. */
  feeTreasuryAddress?: Address;
};

export type PlanResult = { ok: true; card: ConfirmationCardProps } | { ok: false; error: string };

const GAS_SPONSORED_DISPLAY = '$0.00 (sponsored ✓)';
const GAS_USER_PAYS = 'user pays';
const DEFAULT_CHAIN_ID = 84532;
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const TESTNET_MAX_USDC_AMOUNT = 10_000_000n;
const TESTNET_MAX_WETH_AMOUNT = 10_000_000_000_000_000n;
const TESTNET_MAX_BORROW_USDC_AMOUNT = 5_000_000n;

function testnetCapError(action: string): string {
  return `${action} is testnet-only right now. Keep demo amounts small: max 10 USDC / 0.01 ETH, borrow max 5 USDC.`;
}

function parseTokenAmount(amount: string, decimals: number): bigint {
  return parseUnits(amount, decimals);
}

function enforceTestnetAmountCap(
  action: string,
  asset: string,
  amount: string,
  deps: ExecutorDeps,
): string | undefined {
  if (!deps.stage2Testnet) return undefined;
  const normalized = asset.toUpperCase();
  const decimals = normalized === 'USDC' ? 6 : 18;
  const parsed = parseTokenAmount(amount, decimals);
  const cap =
    action === 'BORROW'
      ? TESTNET_MAX_BORROW_USDC_AMOUNT
      : normalized === 'USDC'
        ? TESTNET_MAX_USDC_AMOUNT
        : TESTNET_MAX_WETH_AMOUNT;
  if (parsed > cap) return testnetCapError(action);
  return undefined;
}

function enforceMainnetBetaAmountCap(action: string, asset: string, amount: string): string | undefined {
  const normalized = asset.toUpperCase();
  const decimals = normalized === 'USDC' ? 6 : 18;
  const parsed = parseTokenAmount(amount, decimals);
  const cap = normalized === 'USDC' ? 100_000_000n : 50_000_000_000_000_000n;
  if (parsed > cap) {
    return `${action} is in private mainnet beta. Max per action: 100 USDC or 0.05 WETH.`;
  }
  return undefined;
}

function routerDeps(deps: ExecutorDeps) {
  if (!deps.stage2Mainnet || !deps.sherpaRouterAddress || !deps.aerodromeRouterAddress || !deps.aave?.poolAddress) {
    return undefined;
  }
  return {
    routerAddress: deps.sherpaRouterAddress,
    aerodromeRouterAddress: deps.aerodromeRouterAddress,
    aerodromeFactoryAddress: deps.aerodromeFactoryAddress,
    aavePoolAddress: deps.aave.poolAddress,
    rpcUrl: deps.stage2RpcUrl,
    readContract: deps.stage2ReadContract,
  };
}

function mainnetWarnings(feature: string): string[] {
  return [
    `${feature} is live for private beta wallets on Base mainnet. Start with tiny amounts.`,
    'Mainnet action: you pay network gas; Sherpa will not attach the Sepolia paymaster.',
  ];
}

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

function resolveIdentity(input: string, deps: ExecutorDeps) {
  if (deps.resolver && !ADDRESS_RE.test(input.trim())) return deps.resolver(input);
  return resolve(input, deps.backends);
}

export function applyFee(
  calls: Array<{ to: `0x${string}`; data: `0x${string}`; value: bigint }>,
  outputAmount: bigint,
  feeBps: number,
  treasury: `0x${string}`,
  outputToken: `0x${string}`,
): Array<{ to: `0x${string}`; data: `0x${string}`; value: bigint }> {
  if (feeBps <= 0 || !treasury) return calls;

  const feeAmount = (outputAmount * BigInt(feeBps)) / 10_000n;
  if (feeAmount <= 0n) return calls;

  const feeTransferData = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [treasury, feeAmount],
  });

  const feeCall = {
    to: outputToken,
    data: feeTransferData,
    value: 0n,
  };

  return [...calls, feeCall];
}

export async function plan(parsed: ParsedIntent, deps: ExecutorDeps = {}): Promise<PlanResult> {
  if (parsed.intent === 'SEND') return planSend(parsed, deps);
  if (parsed.intent === 'BET') return planBet(parsed, deps);
  if (parsed.intent === 'BUY') return planBuy(parsed, deps);
  if (parsed.intent === 'DEPOSIT') return planDeposit(parsed, deps);
  if (parsed.intent === 'SWAP') return planSwap(parsed, deps);
  if (parsed.intent === 'LEND') return planLend(parsed, deps);
  if (parsed.intent === 'BORROW') return planBorrow(parsed, deps);
  if (parsed.intent === 'REPAY') return planRepay(parsed, deps);
  if (parsed.intent === 'WITHDRAW') return planWithdraw(parsed, deps);
  if (parsed.intent === 'DCA') return planDca(parsed, deps);
  if (parsed.intent === 'ALERT') return planAlert(parsed, deps);
  if (parsed.intent === 'AUTO_REPAY') return planAutoRepay(parsed, deps);
  if (parsed.intent === 'TIP') return planTip(parsed, deps);
  if (parsed.intent === 'POLL') return planPoll(parsed, deps);
  if (parsed.intent === 'COLLECT') return planCollect(parsed, deps);
  if (parsed.intent === 'TIME_LOCK') return planTimeLock(parsed, deps);
  if (parsed.intent === 'AUTO_REBALANCE') return planAutoRebalance(parsed, deps);
  if (parsed.intent === 'SESSION_KEY') return planSessionKey(parsed, deps);
  if (parsed.intent === 'STRATEGY') return planStrategy(parsed, deps);
  if (parsed.intent === 'PORTFOLIO') return planPortfolio(parsed, deps);
  if (parsed.intent === 'GOVERNANCE') return planGovernance(parsed, deps);
  if (parsed.intent === 'NOTIFICATION') return planNotification(parsed, deps);
  if (parsed.intent === 'ANALYTICS') return planAnalytics(parsed, deps);
  if (parsed.intent === 'SECURITY') return planSecurity(parsed, deps);
  if (parsed.intent === 'AI_AGENT') return planAIAgent(parsed, deps);
  if (parsed.intent === 'COMPOSABLE') return planComposable(parsed, deps);
  if (parsed.intent === 'RISK') return planRisk(parsed, deps);
  if (parsed.intent === 'POSITIONS') {
    return {
      ok: true,
      card: {
        intent: 'POSITIONS',
        primary_action_label: 'Show positions',
        primary_amount_display: 'Aave V3',
        secondary_amount_display: 'Base mainnet',
        steps: [],
        gas_display: '$0.00 (read-only)',
        warnings: [],
        estimated_completion_ms: 500,
      },
    };
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
  if (parsed.intent === 'IDENTITY_LOOKUP') return planIdentityLookup(parsed, deps);
  return { ok: false, error: `intent ${parsed.intent} not supported in Stage 1` };
}

async function planIdentityLookup(parsed: ParsedIntent, deps: ExecutorDeps): Promise<PlanResult> {
  const query = typeof parsed.slots.query === 'string' ? parsed.slots.query : '';
  if (!query) return { ok: false, error: 'missing slots: query' };

  const resolved = await resolveIdentity(query, deps);
  if (!isResolved(resolved)) {
    return { ok: false, error: `could not resolve identity "${query}" (${resolved.type})` };
  }

  return {
    ok: true,
    card: {
      intent: 'IDENTITY_LOOKUP',
      primary_action_label: 'Lookup identity',
      primary_amount_display: resolved.display,
      secondary_amount_display: resolved.address,
      recipient_display: resolved.address,
      recipient_metadata: { source: resolved.source, query, ...(resolved.metadata ?? {}) },
      steps: [],
      gas_display: '$0.00 (read-only)',
      warnings: [],
      estimated_completion_ms: 500,
    },
  };
}

async function planBet(parsed: ParsedIntent, deps: ExecutorDeps): Promise<PlanResult> {
  const lim = deps.limitless ?? defaultLimitless;
  const slots = parsed.slots;
  const stakeStr =
    typeof slots.usd === 'string'
      ? slots.usd
      : typeof slots.amount === 'string'
        ? slots.amount
        : '';
  const predicate = typeof slots.predicate === 'string' ? slots.predicate : '';
  const explicitOutcome = typeof slots.outcome === 'string' ? slots.outcome.toUpperCase() : '';
  if (!stakeStr) return { ok: false, error: 'missing slots: stake' };
  const outcomeWord = explicitOutcome || (/\byes\b/i.test(predicate) ? 'YES' : 'NO');
  const outcome: 0 | 1 = outcomeWord === 'YES' ? 1 : 0;

  // 1. Search Limitless first
  let provider: 'limitless' | 'polyforge' = 'limitless';
  let marketId: `0x${string}` | undefined;
  let _marketQuestion = predicate;

  if (lim.factoryAddress) {
    try {
      const limitlessMarkets = await lim.findMarket({ predicate });
      const best = limitlessMarkets[0];
      if (best) {
        marketId = best.id;
        _marketQuestion = best.title || predicate;
      }
    } catch {
      // Limitless search failed — fall through to PolyForge
    }
  }

  // 2. If no match, search PolyForge
  if (!marketId) {
    try {
      const polyforgeMarkets = await searchPolyForgeMarkets({ query: predicate });
      const best = polyforgeMarkets[0];
      if (best) {
        provider = 'polyforge';
        marketId = best.id as `0x${string}`;
        _marketQuestion = best.question || predicate;
      }
    } catch {
      // PolyForge search failed — fall through to error
    }
  }

  // 3. If still no match, return error
  if (!marketId) {
    return { ok: false, error: "Couldn't find a market matching that question. Try being more specific." };
  }

  const warnings: string[] = [];

  if (provider === 'limitless') {
    if (!lim.factoryAddress) {
      return { ok: false, error: "BET isn't available on this network yet." };
    }

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

  // provider === 'polyforge'
  const polyforgeMarkets = await searchPolyForgeMarkets({ query: predicate });
  const matchedMarket = polyforgeMarkets.find((m) => m.id === marketId);
  if (!matchedMarket) {
    return { ok: false, error: "Couldn't find a market matching that question. Try being more specific." };
  }

  const side = outcomeWord === 'YES' ? 'YES' : 'NO' as const;
  const orderCall = buildPolyForgeOrder({ market: matchedMarket, side, amount: BigInt(stakeStr) });

  const expectedShares = BigInt(stakeStr);
  const pending: PendingTx = {
    to: orderCall.to,
    data: orderCall.data,
    value: orderCall.value,
    asset: ALLOWED_CONTRACTS.USDC,
    amount: expectedShares,
    recipientSource: 'direct',
  };
  const r = await runRings(pending, deps);
  if (!r.ok) return r;

  const approve = buildApproveCall(orderCall.to, expectedShares);
  const steps: ExecutionStep[] = [
    {
      kind: 'approve',
      to: approve.to,
      data: approve.data,
      value: approve.value,
      label: `Approve ${stakeStr} USDC for PolyForge`,
    },
    {
      kind: 'bet',
      to: orderCall.to,
      data: orderCall.data,
      value: orderCall.value,
      label: `Bet ${stakeStr} USDC on ${outcomeWord} via PolyForge${predicate ? ` (${predicate})` : ''}`,
    },
  ];

  return {
    ok: true,
    card: {
      intent: 'BET',
      primary_action_label: 'Place bet',
      primary_amount_display: `${stakeStr} USDC`,
      secondary_amount_display: `≈ ${expectedShares} shares`,
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

  const uni = deps.uniswap ?? defaultUniswap;
  const params = { usd, asset: 'ETH' as const, recipient: deps.userAddress };
  const tx = await uni.buildTx(params);
  const verified = await uni.verify(tx);
  if (!verified.ok) return { ok: false, error: `tx verify failed: ${verified.reason}` };
  const quote = await uni.quote(params);

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

  const resolved = await resolveIdentity(toInput, deps);
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

async function planSwap(parsed: ParsedIntent, deps: ExecutorDeps): Promise<PlanResult> {
  const slots = parsed.slots;
  const fromAmount = typeof slots.fromAmount === 'string' ? slots.fromAmount : '';
  const fromAsset = typeof slots.fromAsset === 'string' ? slots.fromAsset.toUpperCase() : '';
  const toAsset = typeof slots.toAsset === 'string' ? slots.toAsset.toUpperCase() : '';
  const slippagePct = typeof slots.slippagePct === 'number' ? slots.slippagePct : undefined;

  if (!fromAmount || !fromAsset || !toAsset) {
    return { ok: false, error: 'missing slots: fromAmount/fromAsset/toAsset' };
  }
  if (fromAsset === toAsset) {
    return { ok: false, error: 'fromAsset and toAsset must differ' };
  }

  const fromToken = resolveToken(fromAsset);
  const toToken = resolveToken(toAsset);
  if (!fromToken) {
    return { ok: false, error: `Sherpa doesn't know about ${fromAsset} yet. Try USDC, ETH, or WETH.` };
  }
  if (!toToken) {
    return { ok: false, error: `Sherpa doesn't know about ${toAsset} yet. Try USDC, ETH, or WETH.` };
  }

  // Slippage validation
  let slippageBps = 50; // default 0.5%
  if (slippagePct !== undefined) {
    if (slippagePct < 0.1) {
      return { ok: false, error: 'Slippage must be at least 0.1%.' };
    }
    slippageBps = Math.round(slippagePct * 100);
  }

  if (!deps.userAddress) {
    return { ok: false, error: 'SWAP requires a connected wallet.' };
  }
  const capError = enforceTestnetAmountCap('SWAP', fromAsset, fromAmount, deps);
  if (capError) return { ok: false, error: capError };

  if (deps.stage2Mainnet) {
    const betaCapError = enforceMainnetBetaAmountCap('SWAP', fromAsset, fromAmount);
    if (betaCapError) return { ok: false, error: betaCapError };
    const rd = routerDeps(deps);
    if (!rd) return { ok: false, error: 'SWAP mainnet beta is not configured.' };
    try {
      const routerPlan = await buildSherpaRouterSwapPlan({
        fromAsset,
        toAsset,
        amount: fromAmount,
        slippageBps,
        deps: rd,
      });
      const pending: PendingTx = {
        to: deps.sherpaRouterAddress!,
        data: routerPlan.steps.at(-1)?.data ?? '0x',
        value: 0n,
        asset: routerPlan.asset.address as Address,
        amount: routerPlan.amountBaseUnits,
        recipientSource: 'direct',
      };
      const r = await runRings(pending, deps, [deps.sherpaRouterAddress!, routerPlan.asset.address as Address]);
      if (!r.ok) return r;

      const steps: ExecutionStep[] = routerPlan.steps;
      return {
        ok: true,
        card: {
          intent: 'SWAP',
          primary_action_label: 'Swap',
          primary_amount_display: `${fromAmount} ${routerPlan.asset.symbol}`,
          secondary_amount_display: routerPlan.secondaryDisplay,
          steps,
          batch: envelopeFor(steps, { ...deps, paymasterUrl: undefined }),
          gas_display: GAS_USER_PAYS,
          warnings: mainnetWarnings('Swap'),
          estimated_completion_ms: 10_000,
          protocolFeeBps: 10,
          feeAsset: routerPlan.asset.symbol,
        },
      };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  // Guard: Aerodrome not configured → graceful error (not a crash)
  try {
    const result = await buildSwapCall(
      fromAsset as 'USDC' | 'ETH',
      toAsset as 'USDC' | 'ETH',
      fromAmount,
      deps.userAddress,
      { pyth: false, routerAddress: deps.aerodromeRouterAddress, slippageBps },
    );

    const verified = await verifySwap(
      { to: result.to, data: result.data, value: result.value, sponsorable: result.sponsorable },
      { routerAddress: deps.aerodromeRouterAddress },
    );
    if (!verified.ok) return { ok: false, error: `tx verify failed: ${verified.reason}` };

    const warnings: string[] = [];
    if (deps.stage2Testnet) {
      warnings.push('Base Sepolia testnet only. This uses a mock Aerodrome router and is not mainnet liquidity.');
    }
    if (slippageBps > 500) {
      warnings.push(`High slippage tolerance (${(slippageBps / 100).toFixed(1)}%). Price may move significantly.`);
    }

    // Build steps: approve (if ERC-20) + swap
    const steps: ExecutionStep[] = [];
    if (fromAsset !== 'ETH') {
      const approve = buildApproveCall(result.to, result.quote.amountInBaseUnits);
      steps.push({
        kind: 'approve',
        to: approve.to,
        data: approve.data,
        value: approve.value,
        label: `Approve ${fromAmount} ${fromAsset} for Aerodrome`,
      });
    }
    steps.push({
      kind: 'swap',
      to: result.to,
      data: result.data,
      value: result.value,
      label: `Swap ${fromAmount} ${fromAsset} → ${toAsset}`,
    });

    // Protocol fee (P5): compute after swap quote, append ERC-20 transfer to treasury
    const q = result.quote;
    let protocolFeeBps: number | undefined;
    let protocolFeeAmount: bigint | undefined;
    let feeAsset: string | undefined;

    const feeEnabled = deps.feeEnabled ?? false;
    const feeBps = deps.feeBps ?? 10;
    const treasury = deps.feeTreasuryAddress;

    // Only charge fee on ERC-20 outputs (ETH fee would require WETH wrapping)
    if (feeEnabled && treasury && toAsset !== 'ETH' && q.amountOutBaseUnits > 0n) {
      const feeAmount = (q.amountOutBaseUnits * BigInt(feeBps)) / 10_000n;
      if (feeAmount > 0n) {
        const toTokenAddress = toAsset === 'USDC' ? ALLOWED_CONTRACTS.USDC : ALLOWED_CONTRACTS.WETH;
        const feeTransferData = encodeFunctionData({
          abi: erc20Abi,
          functionName: 'transfer',
          args: [treasury, feeAmount],
        });
        steps.push({
          kind: 'custom',
          to: toTokenAddress,
          data: feeTransferData,
          value: 0n,
          label: `Protocol fee: ${toAsset}`,
        });
        protocolFeeBps = feeBps;
        protocolFeeAmount = feeAmount;
        feeAsset = toAsset;
      }
    }

    return {
      ok: true,
      card: {
        intent: 'SWAP',
        primary_action_label: 'Swap',
        primary_amount_display: `${fromAmount} ${fromAsset}`,
        secondary_amount_display: q.display,
        steps,
        batch: envelopeFor(steps, deps),
        gas_display: gasDisplay(steps, deps),
        warnings,
        estimated_completion_ms: 6_000,
        protocolFeeBps,
        protocolFeeAmount,
        feeAsset,
      },
    };
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes('not yet configured') || msg.includes('not configured')) {
      return { ok: false, error: "SWAP isn't available on this network yet." };
    }
    return { ok: false, error: msg };
  }
}

async function planLend(parsed: ParsedIntent, deps: ExecutorDeps): Promise<PlanResult> {
  const slots = parsed.slots;
  const amount = typeof slots.amount === 'string' ? slots.amount : '';
  const asset = (typeof slots.asset === 'string' ? slots.asset : '').toUpperCase();

  if (!amount || !asset) {
    return { ok: false, error: 'missing slots: amount/asset' };
  }
  if (!deps.userAddress) {
    return { ok: false, error: 'LEND requires a connected wallet.' };
  }

  if (deps.stage2Mainnet) {
    const betaCapError = enforceMainnetBetaAmountCap('LEND', asset, amount);
    if (betaCapError) return { ok: false, error: betaCapError };
    const rd = routerDeps(deps);
    if (!rd) return { ok: false, error: 'LEND mainnet beta is not configured.' };
    try {
      const routerPlan = await buildSherpaRouterSupplyPlan({ asset, amount, deps: rd });
      const pending: PendingTx = {
        to: deps.sherpaRouterAddress!,
        data: routerPlan.steps.at(-1)?.data ?? '0x',
        value: 0n,
        asset: routerPlan.asset.address as Address,
        amount: routerPlan.amountBaseUnits,
        recipientSource: 'direct',
      };
      const r = await runRings(pending, deps, [deps.sherpaRouterAddress!, routerPlan.asset.address as Address]);
      if (!r.ok) return r;
      const steps: ExecutionStep[] = routerPlan.steps;
      return {
        ok: true,
        card: {
          intent: 'LEND',
          primary_action_label: 'Lend',
          primary_amount_display: `${amount} ${routerPlan.asset.symbol}`,
          secondary_amount_display: routerPlan.secondaryDisplay,
          steps,
          batch: envelopeFor(steps, { ...deps, paymasterUrl: undefined }),
          gas_display: GAS_USER_PAYS,
          warnings: mainnetWarnings('Lend'),
          estimated_completion_ms: 10_000,
        },
      };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  if (asset !== 'USDC') {
    return { ok: false, error: `Aave doesn't support ${asset} on this network. Try USDC.` };
  }
  const capError = enforceTestnetAmountCap('LEND', asset, amount, deps);
  if (capError) return { ok: false, error: capError };

  const aaveAdapter = deps.aave ?? defaultAave;

  // Guard: Aave not configured → graceful error
  try {
    const lendParams: AaveLendParams = {
      action: 'deposit',
      asset: 'USDC',
      amount,
      recipient: deps.userAddress,
    };

    const q = await aaveAdapter.quote(lendParams);
    const tx = await aaveAdapter.buildTx(lendParams);
    const verified = await aaveAdapter.verify(tx);
    if (!verified.ok) return { ok: false, error: `tx verify failed: ${verified.reason}` };

    const pending: PendingTx = {
      to: tx.to,
      data: tx.data,
      value: tx.value,
      asset: ALLOWED_CONTRACTS.USDC,
      amount: q.amountBaseUnits,
      recipientSource: 'direct',
    };
    const r = await runRings(pending, deps, [tx.to]);
    if (!r.ok) return r;

    const warnings: string[] = [];
    if (deps.stage2Testnet) {
      warnings.push('Base Sepolia testnet only. This supplies to the configured Aave V3 testnet pool.');
    }
    if (q.supplyApyBps < 100) {
      warnings.push(`Low supply APY (${(q.supplyApyBps / 100).toFixed(2)}%). Consider waiting for better rates.`);
    }

    // Build steps: approve + supply
    const approve = buildApproveCall(tx.to, q.amountBaseUnits);
    const steps: ExecutionStep[] = [
      {
        kind: 'approve',
        to: approve.to,
        data: approve.data,
        value: approve.value,
        label: `Approve ${amount} USDC for Aave`,
      },
      {
        kind: 'custom',
        to: tx.to,
        data: tx.data,
        value: tx.value,
        label: `Supply ${amount} USDC to Aave @ ${(q.supplyApyBps / 100).toFixed(2)}% APY`,
      },
    ];

    return {
      ok: true,
      card: {
        intent: 'LEND',
        primary_action_label: 'Lend',
        primary_amount_display: `${amount} USDC`,
        secondary_amount_display: q.display,
        steps,
        batch: envelopeFor(steps, deps),
        gas_display: gasDisplay(steps, deps),
        warnings,
        estimated_completion_ms: 6_000,
      },
    };
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes('not yet configured') || msg.includes('not configured')) {
      return { ok: false, error: "LEND isn't available on this network yet. Try a different intent." };
    }
    if (msg.includes('unsupported asset')) {
      return { ok: false, error: `Aave doesn't support ${asset} on this network. Try USDC.` };
    }
    return { ok: false, error: msg };
  }
}

async function planBorrow(parsed: ParsedIntent, deps: ExecutorDeps): Promise<PlanResult> {
  const slots = parsed.slots;
  const amount =
    typeof slots.amount === 'string'
      ? slots.amount
      : typeof slots.borrowAmount === 'string'
        ? slots.borrowAmount
        : '';
  const asset = (typeof slots.asset === 'string'
    ? slots.asset
    : typeof slots.borrowAsset === 'string'
      ? slots.borrowAsset
      : ''
  ).toUpperCase();

  if (!amount || !asset) {
    return { ok: false, error: 'missing slots: amount/asset' };
  }
  if (!deps.userAddress) {
    return { ok: false, error: 'BORROW requires a connected wallet.' };
  }

  if (deps.stage2Mainnet) {
    const betaCapError = enforceMainnetBetaAmountCap('BORROW', asset, amount);
    if (betaCapError) return { ok: false, error: betaCapError };
    const rd = routerDeps(deps);
    if (!rd) return { ok: false, error: 'BORROW mainnet beta is not configured.' };
    try {
      const routerPlan = await buildSherpaRouterBorrowPlan({ asset, amount, deps: rd });
      const pending: PendingTx = {
        to: deps.sherpaRouterAddress!,
        data: routerPlan.steps.at(-1)?.data ?? '0x',
        value: 0n,
        asset: routerPlan.asset.address as Address,
        amount: routerPlan.amountBaseUnits,
        recipientSource: 'direct',
      };
      const r = await runRings(pending, deps, [deps.sherpaRouterAddress!, routerPlan.asset.address as Address]);
      if (!r.ok) return r;
      const steps: ExecutionStep[] = routerPlan.steps;
      return {
        ok: true,
        card: {
          intent: 'BORROW',
          primary_action_label: 'Borrow',
          primary_amount_display: `${amount} ${routerPlan.asset.symbol}`,
          secondary_amount_display: routerPlan.secondaryDisplay,
          steps,
          batch: envelopeFor(steps, { ...deps, paymasterUrl: undefined }),
          gas_display: GAS_USER_PAYS,
          warnings: mainnetWarnings('Borrow'),
          estimated_completion_ms: 10_000,
        },
      };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  if (asset !== 'USDC') {
    return { ok: false, error: `Aave testnet borrowing starts with USDC. Try USDC.` };
  }
  const capError = enforceTestnetAmountCap('BORROW', asset, amount, deps);
  if (capError) return { ok: false, error: capError };

  const token = resolveToken(asset);
  if (!token) {
    return { ok: false, error: `Sherpa doesn't know about ${asset} yet. Try USDC, ETH, or WETH.` };
  }

  const aaveAdapter = deps.aave ?? defaultAave;
  const poolAddress = aaveAdapter.poolAddress;
  if (!poolAddress) {
    return { ok: false, error: "BORROW isn't available on this network yet." };
  }

  try {
    const borrowParams: AaveBorrowParams = {
      asset,
      amount: parseTokenAmount(amount, token.decimals),
      interestMode: 'variable',
    };

    const borrowResult = await buildBorrowCall(
      {
        asset: token.address as Address,
        amount: borrowParams.amount,
        interestRateMode: 2,
        onBehalfOf: deps.userAddress,
      },
      { poolAddress },
    );

    const warnings: string[] = deps.stage2Testnet
      ? ['Base Sepolia testnet only. Borrow requires sufficient Aave collateral on Base Sepolia.']
      : [];

    const steps: ExecutionStep[] = [
      {
        kind: 'custom',
        to: borrowResult.to,
        data: borrowResult.data,
        value: borrowResult.value,
        label: `Borrow ${amount} ${asset} from Aave`,
      },
    ];

    return {
      ok: true,
      card: {
        intent: 'BORROW',
        primary_action_label: 'Borrow',
        primary_amount_display: `${amount} ${asset}`,
        steps,
        batch: envelopeFor(steps, deps),
        gas_display: gasDisplay(steps, deps),
        warnings,
        estimated_completion_ms: 6_000,
      },
    };
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes('not yet configured') || msg.includes('not configured')) {
      return { ok: false, error: "BORROW isn't available on this network yet." };
    }
    if (msg.includes('unsupported asset') || msg.includes('not borrowable')) {
      return { ok: false, error: `Aave doesn't support borrowing ${asset} on this network.` };
    }
    return { ok: false, error: msg };
  }
}

async function planRepay(parsed: ParsedIntent, deps: ExecutorDeps): Promise<PlanResult> {
  const amount = typeof parsed.slots.amount === 'string' ? parsed.slots.amount : '';
  const asset = (typeof parsed.slots.asset === 'string' ? parsed.slots.asset : '').toUpperCase();
  if (!amount || !asset) return { ok: false, error: 'missing slots: amount/asset' };
  if (!deps.userAddress) return { ok: false, error: 'REPAY requires a connected wallet.' };
  if (!deps.stage2Mainnet) return { ok: false, error: 'REPAY is pending private mainnet beta enablement.' };

  const betaCapError = enforceMainnetBetaAmountCap('REPAY', asset, amount);
  if (betaCapError) return { ok: false, error: betaCapError };
  const rd = routerDeps(deps);
  if (!rd) return { ok: false, error: 'REPAY mainnet beta is not configured.' };
  try {
    const routerPlan = await buildSherpaRouterRepayPlan({ asset, amount, deps: rd });
    const pending: PendingTx = {
      to: deps.sherpaRouterAddress!,
      data: routerPlan.steps.at(-1)?.data ?? '0x',
      value: 0n,
      asset: routerPlan.asset.address as Address,
      amount: routerPlan.amountBaseUnits,
      recipientSource: 'direct',
    };
    const r = await runRings(pending, deps, [deps.sherpaRouterAddress!, routerPlan.asset.address as Address]);
    if (!r.ok) return r;
    const steps: ExecutionStep[] = routerPlan.steps;
    return {
      ok: true,
      card: {
        intent: 'REPAY',
        primary_action_label: 'Repay',
        primary_amount_display: `${amount} ${routerPlan.asset.symbol}`,
        secondary_amount_display: routerPlan.secondaryDisplay,
        steps,
        batch: envelopeFor(steps, { ...deps, paymasterUrl: undefined }),
        gas_display: GAS_USER_PAYS,
        warnings: mainnetWarnings('Repay'),
        estimated_completion_ms: 10_000,
      },
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

async function planWithdraw(parsed: ParsedIntent, deps: ExecutorDeps): Promise<PlanResult> {
  const amount = typeof parsed.slots.amount === 'string' ? parsed.slots.amount : '';
  const asset = (typeof parsed.slots.asset === 'string' ? parsed.slots.asset : '').toUpperCase();
  if (!amount || !asset) return { ok: false, error: 'missing slots: amount/asset' };
  if (!deps.userAddress) return { ok: false, error: 'WITHDRAW requires a connected wallet.' };
  if (!deps.stage2Mainnet) return { ok: false, error: 'WITHDRAW is pending private mainnet beta enablement.' };

  const betaCapError = enforceMainnetBetaAmountCap('WITHDRAW', asset, amount);
  if (betaCapError) return { ok: false, error: betaCapError };
  const rd = routerDeps(deps);
  if (!rd) return { ok: false, error: 'WITHDRAW mainnet beta is not configured.' };
  try {
    const routerPlan = await buildSherpaRouterWithdrawPlan({ asset, amount, deps: rd });
    const pending: PendingTx = {
      to: deps.sherpaRouterAddress!,
      data: routerPlan.steps.at(-1)?.data ?? '0x',
      value: 0n,
      asset: routerPlan.asset.address as Address,
      amount: routerPlan.amountBaseUnits,
      recipientSource: 'direct',
    };
    const r = await runRings(pending, deps, [deps.sherpaRouterAddress!, routerPlan.asset.address as Address]);
    if (!r.ok) return r;
    const steps: ExecutionStep[] = routerPlan.steps;
    return {
      ok: true,
      card: {
        intent: 'WITHDRAW',
        primary_action_label: 'Withdraw',
        primary_amount_display: `${amount} ${routerPlan.asset.symbol}`,
        secondary_amount_display: routerPlan.secondaryDisplay,
        steps,
        batch: envelopeFor(steps, { ...deps, paymasterUrl: undefined }),
        gas_display: GAS_USER_PAYS,
        warnings: mainnetWarnings('Withdraw'),
        estimated_completion_ms: 10_000,
      },
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

async function planDca(parsed: ParsedIntent, _deps: ExecutorDeps): Promise<PlanResult> {
  const slots = parsed.slots;
  const dcaAmount = typeof slots.dcaAmount === 'string' ? slots.dcaAmount : '';
  const dcaAsset = typeof slots.dcaAsset === 'string' ? slots.dcaAsset : 'ETH';
  const frequency = typeof slots.frequency === 'string' ? slots.frequency : 'weekly';

  if (!dcaAmount) {
    return { ok: false, error: 'missing slots: dcaAmount' };
  }

  return {
    ok: true,
    card: {
      intent: 'DCA',
      primary_action_label: 'Start DCA',
      primary_amount_display: `${dcaAmount} ${dcaAsset}`,
      secondary_amount_display: `every ${frequency}`,
      steps: [],
      gas_display: GAS_SPONSORED_DISPLAY,
      warnings: [],
      estimated_completion_ms: 500,
    },
  };
}

async function planAlert(parsed: ParsedIntent, _deps: ExecutorDeps): Promise<PlanResult> {
  const slots = parsed.slots;
  const conditionType = typeof slots.conditionType === 'string' ? slots.conditionType : '';
  const asset = typeof slots.asset === 'string' ? slots.asset : '';
  const comparison = typeof slots.comparison === 'string' ? slots.comparison : '';
  const threshold = typeof slots.threshold === 'number' ? slots.threshold : 0;
  const notificationChannels = Array.isArray(slots.notificationChannels)
    ? slots.notificationChannels
    : ['push'];

  if (!conditionType) return { ok: false, error: 'missing slots: conditionType' };

  return {
    ok: true,
    card: {
      intent: 'ALERT',
      primary_action_label: 'Set alert',
      primary_amount_display: `${conditionType} ${comparison} ${threshold}`,
      secondary_amount_display: asset ? `on ${asset}` : undefined,
      steps: [],
      gas_display: GAS_SPONSORED_DISPLAY,
      warnings: [],
      estimated_completion_ms: 500,
      alert: { conditionType, asset, comparison, threshold, notificationChannels },
    },
  };
}

async function planAutoRepay(parsed: ParsedIntent, _deps: ExecutorDeps): Promise<PlanResult> {
  const slots = parsed.slots;
  const triggerHF = typeof slots.triggerHF === 'number' ? slots.triggerHF : typeof slots.targetHealthFactor === 'number' ? slots.targetHealthFactor : undefined;
  const targetHF = typeof slots.targetHF === 'number' ? slots.targetHF : typeof slots.targetHealthFactor === 'number' ? slots.targetHealthFactor : undefined;
  const maxRepayPerExecution = typeof slots.maxRepayPerExecution === 'string' ? slots.maxRepayPerExecution : typeof slots.maxRepayPerExecution === 'number' ? String(slots.maxRepayPerExecution) : undefined;
  const repaySource = Array.isArray(slots.repaySource) ? slots.repaySource : ['usdc'];

  if (triggerHF === undefined || targetHF === undefined) {
    return { ok: false, error: 'missing slots: triggerHF/targetHF' };
  }

  return {
    ok: true,
    card: {
      intent: 'AUTO_REPAY',
      primary_action_label: 'Set up auto-repay',
      primary_amount_display: `trigger HF ${triggerHF} → target HF ${targetHF}`,
      secondary_amount_display: maxRepayPerExecution ? `max ${maxRepayPerExecution} per execution` : undefined,
      steps: [],
      gas_display: GAS_SPONSORED_DISPLAY,
      warnings: [],
      estimated_completion_ms: 500,
      autoRepay: {
        triggerHF,
        targetHF,
        maxRepayPerExecution,
        repaySource,
      },
    },
  };
}

async function planTip(parsed: ParsedIntent, _deps: ExecutorDeps): Promise<PlanResult> {
  const slots = parsed.slots;
  const amount = typeof slots.tipAmount === 'string' ? slots.tipAmount : typeof slots.amount === 'string' ? slots.amount : '';
  const recipient = typeof slots.tipRecipient === 'string' ? slots.tipRecipient : '';

  if (!amount || !recipient) {
    return { ok: false, error: 'Missing tip amount or recipient.' };
  }

  const recipientAddress = null; // TODO: resolve Farcaster user to address

  return {
    ok: true,
    card: {
      intent: 'TIP',
      primary_action_label: 'Send Tip',
      primary_amount_display: `$${amount}`,
      secondary_amount_display: `to @${recipient}`,
      steps: [], // Will be filled when address is resolved
      batch: undefined,
      gas_display: 'sponsored',
      warnings: recipientAddress ? [] : ['Recipient address not resolved. They may need to link their wallet.'],
      estimated_completion_ms: 6000,
    },
  };
}

async function planPoll(parsed: ParsedIntent, _deps: ExecutorDeps): Promise<PlanResult> {
  const slots = parsed.slots;
  const question = typeof slots.pollQuestion === 'string' ? slots.pollQuestion : '';

  if (!question) {
    return { ok: false, error: 'Missing poll question.' };
  }

  return {
    ok: true,
    card: {
      intent: 'POLL',
      primary_action_label: 'Create Poll',
      primary_amount_display: question,
      secondary_amount_display: slots.pollOptions ? `${(slots.pollOptions as string[]).length} options` : 'Open poll',
      steps: [], // No on-chain calls
      batch: undefined,
      gas_display: 'free',
      warnings: [],
      estimated_completion_ms: 0,
    },
  };
}

async function planCollect(parsed: ParsedIntent, _deps: ExecutorDeps): Promise<PlanResult> {
  const slots = parsed.slots;
  const target = typeof slots.collectUrl === 'string'
    ? slots.collectUrl
    : typeof slots.collectTarget === 'string'
      ? slots.collectTarget
      : '';
  const quantity = slots.collectAmount ? Number(slots.collectAmount) : 1;

  if (!target) {
    return { ok: false, error: 'Missing collect target (URL or collection name).' };
  }

  return {
    ok: true,
    card: {
      intent: 'COLLECT',
      primary_action_label: 'Collect',
      primary_amount_display: `${quantity} NFT`,
      secondary_amount_display: target,
      steps: [],
      batch: undefined,
      gas_display: 'sponsored',
      warnings: ['Zora collection not resolved. Verify the URL before confirming.'],
      estimated_completion_ms: 6000,
    },
  };
}

async function planTimeLock(parsed: ParsedIntent, _deps: ExecutorDeps): Promise<PlanResult> {
  const slots = parsed.slots;
  const action = typeof slots.scheduledAction === 'string' ? slots.scheduledAction : '';
  const time = typeof slots.scheduledTime === 'string' ? slots.scheduledTime : '';

  if (!action || !time) {
    return { ok: false, error: 'Missing scheduled action or time.' };
  }

  return {
    ok: true,
    card: {
      intent: 'TIME_LOCK',
      primary_action_label: 'Schedule',
      primary_amount_display: action,
      secondary_amount_display: `at ${time}`,
      steps: [],
      batch: undefined,
      gas_display: 'sponsored',
      warnings: [],
      estimated_completion_ms: 6000,
    },
  };
}

async function planAutoRebalance(_parsed: ParsedIntent, _deps: ExecutorDeps): Promise<PlanResult> {
  return {
    ok: true,
    card: {
      intent: 'AUTO_REBALANCE',
      primary_action_label: 'Rebalance Portfolio',
      primary_amount_display: 'Portfolio',
      secondary_amount_display: 'Rebalancing',
      steps: [],
      batch: undefined,
      gas_display: 'sponsored',
      warnings: ['Portfolio rebalancing may incur swap fees.'],
      estimated_completion_ms: 30000,
    },
  };
}

async function planSessionKey(parsed: ParsedIntent, _deps: ExecutorDeps): Promise<PlanResult> {
  const slots = parsed.slots;
  const action = (typeof slots.sessionAction === 'string' ? slots.sessionAction : 'create') as
    | 'create'
    | 'revoke';

  if (action === 'revoke') {
    return {
      ok: true,
      card: {
        intent: 'SESSION_KEY',
        primary_action_label: 'Revoke Session Key',
        primary_amount_display: 'Session Key',
        secondary_amount_display: 'Revoke',
        steps: [],
        batch: undefined,
        gas_display: 'sponsored',
        warnings: ['All automated tasks using this session key will stop.'],
        estimated_completion_ms: 6000,
      },
    };
  }

  return {
    ok: true,
    card: {
      intent: 'SESSION_KEY',
      primary_action_label: 'Create Session Key',
      primary_amount_display: `$${(typeof slots.sessionLimit === 'string' ? slots.sessionLimit : null) ?? 'unlimited'}`,
      secondary_amount_display:
        (typeof slots.sessionPurpose === 'string' ? slots.sessionPurpose : null) ??
        'General automation',
      steps: [],
      batch: undefined,
      gas_display: 'sponsored',
      warnings: [
        'Session key allows automated transactions without your approval.',
        'Set a spend limit to protect your funds.',
      ],
      estimated_completion_ms: 12000,
    },
  };
}

async function planPortfolio(parsed: ParsedIntent, _deps: ExecutorDeps): Promise<PlanResult> {
  const slots = parsed.slots;
  const action = typeof slots.portfolioAction === 'string' ? slots.portfolioAction : 'show';

  if (action === 'pnl') {
    return {
      ok: true,
      card: {
        intent: 'PORTFOLIO',
        primary_action_label: 'Show P&L',
        primary_amount_display: 'Portfolio',
        secondary_amount_display: 'Profit & Loss',
        steps: [],
        batch: undefined,
        gas_display: 'free',
        warnings: [],
        estimated_completion_ms: 0,
      },
    };
  }

  return {
    ok: true,
    card: {
      intent: 'PORTFOLIO',
      primary_action_label: 'Show Portfolio',
      primary_amount_display: typeof slots.portfolioChain === 'string' ? `on ${slots.portfolioChain}` : 'All chains',
      secondary_amount_display: 'Read-only',
      steps: [],
      batch: undefined,
      gas_display: 'free',
      warnings: [],
      estimated_completion_ms: 0,
    },
  };
}

async function planNotification(parsed: ParsedIntent, _deps: ExecutorDeps): Promise<PlanResult> {
  const slots = parsed.slots;
  const action = typeof slots.notificationAction === 'string' ? slots.notificationAction : 'list';

  if (action === 'set_channel') {
    return {
      ok: true,
      card: {
        intent: 'NOTIFICATION',
        primary_action_label: 'Set Notification Channel',
        primary_amount_display: typeof slots.notificationChannel === 'string' ? slots.notificationChannel : 'push',
        secondary_amount_display: 'Preference',
        steps: [],
        batch: undefined,
        gas_display: 'free',
        warnings: [],
        estimated_completion_ms: 0,
      },
    };
  }

  return {
    ok: true,
    card: {
      intent: 'NOTIFICATION',
      primary_action_label: action === 'subscribe' ? 'Subscribe' : 'Notifications',
      primary_amount_display: typeof slots.notificationCondition === 'string' ? slots.notificationCondition : 'All',
      secondary_amount_display: typeof slots.notificationChannel === 'string' ? slots.notificationChannel : 'push',
      steps: [],
      batch: undefined,
      gas_display: 'free',
      warnings: [],
      estimated_completion_ms: 0,
    },
  };
}

async function planStrategy(parsed: ParsedIntent, _deps: ExecutorDeps): Promise<PlanResult> {
  const slots = parsed.slots;
  const action = (typeof slots.strategyAction === 'string' ? slots.strategyAction : 'list') as
    | 'list'
    | 'create'
    | 'follow'
    | 'run';

  if (action === 'list') {
    return {
      ok: true,
      card: {
        intent: 'STRATEGY',
        primary_action_label: 'Browse Strategies',
        primary_amount_display: 'Marketplace',
        secondary_amount_display: 'Public strategies',
        steps: [],
        batch: undefined,
        gas_display: 'free',
        warnings: [],
        estimated_completion_ms: 0,
      },
    };
  }

  return {
    ok: true,
    card: {
      intent: 'STRATEGY',
      primary_action_label:
        action === 'create'
          ? 'Create Strategy'
          : action === 'follow'
            ? 'Follow Strategy'
            : 'Run Strategy',
      primary_amount_display:
        typeof slots.strategyName === 'string' ? slots.strategyName : 'Strategy',
      secondary_amount_display: action,
      steps: [],
      batch: undefined,
      gas_display: 'sponsored',
      warnings: ['Strategy execution involves automated transactions.'],
      estimated_completion_ms: 30000,
    },
  };
}

async function planGovernance(parsed: ParsedIntent, _deps: ExecutorDeps): Promise<PlanResult> {
  const slots = parsed.slots;
  const action = typeof slots.govAction === 'string' ? slots.govAction : 'list';

  if (action === 'vote') {
    return {
      ok: true,
      card: {
        intent: 'GOVERNANCE',
        primary_action_label: `Vote ${typeof slots.govVote === 'string' ? slots.govVote : 'yes'}`,
        primary_amount_display: `Proposal #${typeof slots.govProposalId === 'string' ? slots.govProposalId : '?'}`,
        secondary_amount_display: 'Governance',
        steps: [],
        batch: undefined,
        gas_display: 'sponsored',
        warnings: [],
        estimated_completion_ms: 6000,
      },
    };
  }

  if (action === 'delegate') {
    return {
      ok: true,
      card: {
        intent: 'GOVERNANCE',
        primary_action_label: 'Delegate Votes',
        primary_amount_display: typeof slots.govDelegatee === 'string' ? slots.govDelegatee : 'Delegate',
        secondary_amount_display: 'Governance',
        steps: [],
        batch: undefined,
        gas_display: 'sponsored',
        warnings: ['You can only delegate to one address at a time.'],
        estimated_completion_ms: 6000,
      },
    };
  }

  return {
    ok: true,
    card: {
      intent: 'GOVERNANCE',
      primary_action_label: action === 'propose' ? 'Create Proposal' : 'List Proposals',
      primary_amount_display: 'Governance',
      secondary_amount_display: action,
      steps: [],
      batch: undefined,
      gas_display: action === 'list' ? 'free' : 'sponsored',
      warnings: action === 'propose' ? ['Creating a proposal requires holding governance tokens.'] : [],
      estimated_completion_ms: action === 'list' ? 0 : 12000,
    },
  };
}

async function planAnalytics(parsed: ParsedIntent, _deps: ExecutorDeps): Promise<PlanResult> {
  const slots = parsed.slots;
  const action = typeof slots.analyticsAction === 'string' ? slots.analyticsAction : 'stats';

  return {
    ok: true,
    card: {
      intent: 'ANALYTICS',
      primary_action_label:
        action === 'volume' ? 'Show Volume' : action === 'fees' ? 'Show Fees' : action === 'usage' ? 'Show Usage' : 'Show Stats',
      primary_amount_display: 'Analytics',
      secondary_amount_display: action,
      steps: [],
      batch: undefined,
      gas_display: 'free',
      warnings: [],
      estimated_completion_ms: 0,
    },
  };
}

async function planSecurity(parsed: ParsedIntent, _deps: ExecutorDeps): Promise<PlanResult> {
  const slots = parsed.slots;
  const action = slots.securityAction || 'status';

  if (action === 'multisig') {
    return {
      ok: true,
      card: {
        intent: 'SECURITY',
        primary_action_label: 'Setup Multi-sig',
        primary_amount_display: 'Wallet',
        secondary_amount_display: 'Security',
        steps: [],
        batch: undefined,
        gas_display: 'sponsored',
        warnings: ['Multi-sig requires multiple signers for transactions.'],
        estimated_completion_ms: 30000,
      },
    };
  }

  if (action === 'hardware') {
    return {
      ok: true,
      card: {
        intent: 'SECURITY',
        primary_action_label: 'Connect Hardware Wallet',
        primary_amount_display: 'Ledger/Trezor',
        secondary_amount_display: 'Security',
        steps: [],
        batch: undefined,
        gas_display: 'free',
        warnings: ['Ensure your hardware wallet is connected and unlocked.'],
        estimated_completion_ms: 0,
      },
    };
  }

  return {
    ok: true,
    card: {
      intent: 'SECURITY',
      primary_action_label: action === 'whitelist' ? 'Add to Whitelist' : 'Security Status',
      primary_amount_display: (typeof slots.securityTarget === 'string' ? slots.securityTarget : null) || 'Settings',
      secondary_amount_display: 'Security',
      steps: [],
      batch: undefined,
      gas_display: 'free',
      warnings: [],
      estimated_completion_ms: 0,
    },
  };
}

async function planAIAgent(parsed: ParsedIntent, _deps: ExecutorDeps): Promise<PlanResult> {
  const slots = parsed.slots;
  const action = typeof slots.aiAction === 'string' ? slots.aiAction : 'context';

  if (action === 'remember') {
    return {
      ok: true,
      card: {
        intent: 'AI_AGENT',
        primary_action_label: 'Remember',
        primary_amount_display: typeof slots.aiMemory === 'string' ? slots.aiMemory : 'Memory',
        secondary_amount_display: 'AI Agent',
        steps: [],
        batch: undefined,
        gas_display: 'free',
        warnings: [],
        estimated_completion_ms: 0,
      },
    };
  }

  if (action === 'plan') {
    return {
      ok: true,
      card: {
        intent: 'AI_AGENT',
        primary_action_label: 'Create Plan',
        primary_amount_display: typeof slots.aiGoal === 'string' ? slots.aiGoal : 'Goal',
        secondary_amount_display: 'AI Planning',
        steps: [],
        batch: undefined,
        gas_display: 'free',
        warnings: ['AI-generated plans should be reviewed before execution.'],
        estimated_completion_ms: 0,
      },
    };
  }

  if (action === 'explain') {
    return {
      ok: true,
      card: {
        intent: 'AI_AGENT',
        primary_action_label: 'Explain',
        primary_amount_display: typeof slots.aiTopic === 'string' ? slots.aiTopic : 'Topic',
        secondary_amount_display: 'Education',
        steps: [],
        batch: undefined,
        gas_display: 'free',
        warnings: [],
        estimated_completion_ms: 0,
      },
    };
  }

  return {
    ok: true,
    card: {
      intent: 'AI_AGENT',
      primary_action_label: action === 'forget' ? 'Forget' : 'Show Context',
      primary_amount_display: 'AI Agent',
      secondary_amount_display: action,
      steps: [],
      batch: undefined,
      gas_display: 'free',
      warnings: [],
      estimated_completion_ms: 0,
    },
  };
}

async function planComposable(parsed: ParsedIntent, _deps: ExecutorDeps): Promise<PlanResult> {
  const slots = parsed.slots;
  const action = (typeof slots.composableAction === 'string' ? slots.composableAction : 'compose') as
    | 'flash_loan'
    | 'leverage'
    | 'deleverage'
    | 'compose';

  if (action === 'flash_loan') {
    return {
      ok: true,
      card: {
        intent: 'COMPOSABLE',
        primary_action_label: 'Flash Loan',
        primary_amount_display: `${typeof slots.composableAmount === 'string' ? slots.composableAmount : '?'} ${typeof slots.composableAsset === 'string' ? slots.composableAsset : '?'}`,
        secondary_amount_display: 'Aave',
        steps: [],
        batch: undefined,
        gas_display: 'sponsored',
        warnings: ['Flash loans must be repaid in the same transaction.'],
        estimated_completion_ms: 12000,
      },
    };
  }

  if (action === 'leverage') {
    return {
      ok: true,
      card: {
        intent: 'COMPOSABLE',
        primary_action_label: 'Leverage',
        primary_amount_display: `${typeof slots.composableAsset === 'string' ? slots.composableAsset : '?'} ${typeof slots.composableLeverage === 'string' ? slots.composableLeverage : '?'}x`,
        secondary_amount_display: 'Aave + DEX',
        steps: [],
        batch: undefined,
        gas_display: 'sponsored',
        warnings: ['Leverage increases both gains and losses. Liquidation risk exists.'],
        estimated_completion_ms: 30000,
      },
    };
  }

  return {
    ok: true,
    card: {
      intent: 'COMPOSABLE',
      primary_action_label: action === 'deleverage' ? 'Deleverage' : 'Compose',
      primary_amount_display: (typeof slots.composableAsset === 'string' ? slots.composableAsset : null) || 'Strategy',
      secondary_amount_display: 'Multi-step',
      steps: [],
      batch: undefined,
      gas_display: 'sponsored',
      warnings: ['Complex DeFi operations carry higher risk.'],
      estimated_completion_ms: 30000,
    },
  };
}

async function planRisk(parsed: ParsedIntent, _deps: ExecutorDeps): Promise<PlanResult> {
  const slots = parsed.slots;
  const action = (typeof slots.riskAction === 'string' ? slots.riskAction : 'check') as
    | 'check'
    | 'hedge'
    | 'exposure';

  return {
    ok: true,
    card: {
      intent: 'RISK',
      primary_action_label: action === 'hedge' ? 'Hedge Portfolio' : action === 'exposure' ? 'Show Exposure' : 'Risk Assessment',
      primary_amount_display: 'Portfolio',
      secondary_amount_display: action,
      steps: [],
      batch: undefined,
      gas_display: 'free',
      warnings: action === 'hedge' ? ['Hedging may involve swap fees.'] : [],
      estimated_completion_ms: action === 'hedge' ? 30000 : 0,
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
    simulate: deps.simulate,
    extraAllowlistedAddresses,
  });
  if (!ringsOk(rings)) {
    const fail = firstFailure(rings);
    const reason = fail && !fail.ok ? fail.reason : '';
    return { ok: false, error: `safety ${fail?.ring} failed: ${reason}` };
  }
  return { ok: true };
}
