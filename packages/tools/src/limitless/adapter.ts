/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { encodeFunctionData, erc20Abi, parseUnits } from 'viem';
import {
  ALLOWED_CONTRACTS,
  LIMITLESS_FACTORY_ADDRESS,
  assertAllowlisted,
  type Address,
} from '@sherpa/safety';
import type { BuildTx, BuiltTx, Quote, ToolAdapter, Verify } from '../types.js';

export class LimitlessNotConfiguredError extends Error {
  constructor() {
    super('Limitless Sepolia address not yet configured');
    this.name = 'LimitlessNotConfiguredError';
  }
}

/**
 * Limitless Exchange BET adapter — Base Sepolia.
 *
 * Two-step flow batched via EIP-5792:
 *   1. USDC.approve(factoryAddress, stake)
 *   2. CTFExchange.buyOutcomeShares(marketId, outcome, stake, minSharesOut)
 *
 * `quote()` calls the Limitless REST API when configured; otherwise returns a
 * 50/50 stub so unit tests run offline. `findMarket()` searches the REST API
 * for markets matching a natural-language predicate; results cache for 5
 * minutes by query hash.
 *
 * The factory address comes from `@sherpa/safety`'s
 * `LIMITLESS_FACTORY_ADDRESS` constant by default. Tests may pass an explicit
 * `factoryAddress` to `createLimitless()` to construct a configured adapter
 * without setting the global constant; the adapter then vouches for that
 * address through `assertAllowlisted`'s `extras` parameter.
 */

export type BetParams = {
  stake: string;
  marketId: `0x${string}`;
  outcome: 0 | 1;
  slippageBps?: number;
};

export type BetQuote = {
  asset: 'USDC';
  stakeBaseUnits: bigint;
  minSharesOut: bigint;
  estimatedPayoutBaseUnits: bigint;
  odds: string;
};

export type FindMarketParams = {
  predicate: string;
  asset?: string;
  threshold?: string | number;
  deadline?: string | Date;
};

export type LimitlessMarket = {
  id: `0x${string}`;
  title: string;
  /** USD volume — used to pick the highest-volume match in the executor. */
  volume: number;
  /** ISO timestamp; optional. */
  endsAt?: string;
};

const DEFAULT_SLIPPAGE_BPS = 100;
const FIND_MARKET_CACHE_TTL_MS = 5 * 60 * 1000;
const FIND_MARKET_DEFAULT_LIMIT = 10;

const CTF_EXCHANGE_ABI = [
  {
    type: 'function',
    name: 'buyOutcomeShares',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'marketId', type: 'bytes32' },
      { name: 'outcome', type: 'uint8' },
      { name: 'stake', type: 'uint256' },
      { name: 'minSharesOut', type: 'uint256' },
    ],
    outputs: [{ name: 'sharesOut', type: 'uint256' }],
  },
] as const;

export type LimitlessConfig = {
  apiUrl?: string;
  fetchImpl?: typeof fetch;
  /**
   * Override the factory address from `@sherpa/safety`. When set, the adapter
   * vouches for this address in Ring 1 via `assertAllowlisted(target,
   * [factoryAddress])`. Used by tests; production should leave this unset and
   * configure `LIMITLESS_FACTORY_ADDRESS` in safety once the team confirms it.
   */
  factoryAddress?: Address;
  /** Test seam for the cache clock; defaults to `Date.now`. */
  now?: () => number;
};

type RestMarketQuote = { yesPrice: string; noPrice: string };

/**
 * Best-guess REST shape for `GET /markets?search=...`. We accept either a bare
 * array or a `{ markets: [...] }` envelope. Field names are the obvious ones;
 * adjust here once the real Limitless API is wired.
 */
type RestMarketEnvelope = { markets?: RestMarketRow[] } | RestMarketRow[];
type RestMarketRow = {
  id?: string;
  marketId?: string;
  title?: string;
  question?: string;
  volume?: number | string;
  volumeUsd?: number | string;
  endsAt?: string;
  endDate?: string;
};

function normaliseMarketRow(row: RestMarketRow): LimitlessMarket | null {
  const id = row.id ?? row.marketId;
  if (typeof id !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(id)) return null;
  const title = row.title ?? row.question ?? '';
  const rawVol = row.volume ?? row.volumeUsd ?? 0;
  const volume = typeof rawVol === 'string' ? Number(rawVol) : rawVol;
  return {
    id: id as `0x${string}`,
    title,
    volume: Number.isFinite(volume) ? volume : 0,
    endsAt: row.endsAt ?? row.endDate,
  };
}

function readMarkets(envelope: RestMarketEnvelope): RestMarketRow[] {
  if (Array.isArray(envelope)) return envelope;
  if (envelope.markets && Array.isArray(envelope.markets)) return envelope.markets;
  return [];
}

async function fetchMarketQuote(
  cfg: LimitlessConfig,
  marketId: string,
): Promise<RestMarketQuote | null> {
  if (!cfg.apiUrl) return null;
  const f = cfg.fetchImpl ?? fetch;
  const res = await f(`${cfg.apiUrl}/markets/${marketId}/quote`);
  if (!res.ok) throw new Error(`[limitless] api ${res.status}`);
  return (await res.json()) as RestMarketQuote;
}

/**
 * Adapter shape for `createLimitless`. Extends the standard `ToolAdapter`
 * with Limitless-specific surface: the configured factory address (so the
 * executor can gate BET when unset) and `findMarket`.
 */
export type LimitlessAdapter = ToolAdapter<BetParams, BetQuote, BetParams> & {
  factoryAddress: Address | undefined;
  findMarket: (params: FindMarketParams) => Promise<LimitlessMarket[]>;
};

export function createLimitless(config: LimitlessConfig = {}): LimitlessAdapter {
  const factoryAddress: Address | undefined = config.factoryAddress ?? LIMITLESS_FACTORY_ADDRESS;
  const now = config.now ?? Date.now;
  const extras: readonly Address[] = factoryAddress ? [factoryAddress] : [];

  function requireFactory(): Address {
    if (!factoryAddress) throw new LimitlessNotConfiguredError();
    return factoryAddress;
  }

  const findMarketCache = new Map<string, { expiresAt: number; value: LimitlessMarket[] }>();

  const findMarket = async (params: FindMarketParams): Promise<LimitlessMarket[]> => {
    if (!config.apiUrl) return [];
    const key = JSON.stringify({
      p: params.predicate.trim().toLowerCase(),
      a: params.asset?.toUpperCase(),
      t: params.threshold,
      d: params.deadline instanceof Date ? params.deadline.toISOString() : params.deadline,
    });
    const hit = findMarketCache.get(key);
    if (hit && hit.expiresAt > now()) return hit.value;

    const f = config.fetchImpl ?? fetch;
    const url = new URL(`${config.apiUrl}/markets`);
    url.searchParams.set('search', params.predicate);
    url.searchParams.set('limit', String(FIND_MARKET_DEFAULT_LIMIT));
    url.searchParams.set('sortBy', 'volume');
    if (params.asset) url.searchParams.set('asset', params.asset);
    if (params.threshold !== undefined) {
      url.searchParams.set('threshold', String(params.threshold));
    }
    if (params.deadline !== undefined) {
      const d = params.deadline instanceof Date ? params.deadline.toISOString() : params.deadline;
      url.searchParams.set('deadline', d);
    }

    const res = await f(url.toString());
    if (!res.ok) throw new Error(`[limitless] findMarket api ${res.status}`);
    const envelope = (await res.json()) as RestMarketEnvelope;
    const markets = readMarkets(envelope)
      .map(normaliseMarketRow)
      .filter((m): m is LimitlessMarket => m !== null);

    findMarketCache.set(key, { expiresAt: now() + FIND_MARKET_CACHE_TTL_MS, value: markets });
    return markets;
  };

  const quote: Quote<BetParams, BetQuote> = async (params) => {
    const stakeBaseUnits = parseUnits(params.stake, 6);
    let pricePerShare = 0.5;
    try {
      const m = await fetchMarketQuote(config, params.marketId);
      if (m) {
        const p = Number(params.outcome === 1 ? m.yesPrice : m.noPrice);
        if (Number.isFinite(p) && p > 0 && p < 1) pricePerShare = p;
      }
    } catch {
      pricePerShare = 0.5;
    }
    const sharesFloat = Number(params.stake) / pricePerShare;
    const sharesBaseUnits = parseUnits(sharesFloat.toFixed(6), 6);
    const slippageBps = BigInt(params.slippageBps ?? DEFAULT_SLIPPAGE_BPS);
    const minSharesOut = (sharesBaseUnits * (10_000n - slippageBps)) / 10_000n;
    return {
      asset: 'USDC',
      stakeBaseUnits,
      minSharesOut,
      estimatedPayoutBaseUnits: sharesBaseUnits,
      odds: `${(1 / pricePerShare).toFixed(2)}x`,
    };
  };

  const buildTx: BuildTx<BetParams> = async (params) => {
    const factory = requireFactory();
    const q = await quote(params);
    const data = encodeFunctionData({
      abi: CTF_EXCHANGE_ABI,
      functionName: 'buyOutcomeShares',
      args: [params.marketId, params.outcome, q.stakeBaseUnits, q.minSharesOut],
    });
    const tx: BuiltTx = {
      to: factory,
      data,
      value: 0n,
      sponsorable: true,
    };
    assertAllowlisted(tx.to, extras);
    return tx;
  };

  const verify: Verify = async (tx) => {
    if (!factoryAddress) {
      return { ok: false, reason: 'Limitless Sepolia address not yet configured' };
    }
    if (tx.to.toLowerCase() !== factoryAddress.toLowerCase()) {
      return { ok: false, reason: 'target is not Limitless exchange' };
    }
    if (tx.value !== 0n) {
      return { ok: false, reason: 'Limitless bet must have value=0 (USDC-funded)' };
    }
    return { ok: true };
  };

  return { name: 'limitless', quote, buildTx, verify, findMarket, factoryAddress };
}

/** USDC approval calldata used as step 0 of a Limitless or Uniswap plan. */
export function buildApproveCall(
  spender: Address,
  amountBaseUnits: bigint,
): { to: Address; data: `0x${string}`; value: bigint } {
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'approve',
    args: [spender, amountBaseUnits],
  });
  return { to: ALLOWED_CONTRACTS.USDC, data, value: 0n };
}

export const limitless = createLimitless();
