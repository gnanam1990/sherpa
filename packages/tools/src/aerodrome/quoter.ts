/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { formatUnits, parseUnits } from 'viem';
import { resolveToken, type TokenInfo } from '../registry.js';
import { stubQuote, type PythConfig } from './stub-pricing.js';
import type { AerodromeDeps, AerodromeQuote, SwapAsset } from './types.js';
import { DEFAULT_SLIPPAGE_BPS, DEFAULT_DEADLINE_SECONDS } from './types.js';

export class AerodromeNotConfiguredError extends Error {
  constructor() {
    super('Aerodrome router address not yet configured for this chain');
    this.name = 'AerodromeNotConfiguredError';
  }
}

export class PoolNotFoundError extends Error {
  constructor(from: string, to: string) {
    super(`Aerodrome doesn't have a pool for ${from}/${to} on this network`);
    this.name = 'PoolNotFoundError';
  }
}

export class TokenNotFoundError extends Error {
  constructor(symbol: string) {
    super(`Sherpa doesn't know about ${symbol} yet. Try USDC, ETH, or WETH.`);
    this.name = 'TokenNotFoundError';
  }
}

function decimalsFor(asset: SwapAsset): number {
  return asset === 'USDC' ? 6 : 18;
}

function tokenFor(asset: SwapAsset): TokenInfo {
  const token = resolveToken(asset);
  if (!token) throw new TokenNotFoundError(asset);
  return token;
}

export type QuoterDeps = AerodromeDeps & {
  pyth?: PythConfig | false;
  slippageBps?: number;
};

/**
 * Quote a swap via Aerodrome. Uses stub pricing (Pyth/3000-hardcoded) when
 * the on-chain quoter is unavailable. Returns an AerodromeQuote with full
 * token info, price impact, and slippage-adjusted min output.
 */
export async function quote(
  fromAsset: SwapAsset,
  toAsset: SwapAsset,
  amountIn: string,
  deps: QuoterDeps = {},
): Promise<AerodromeQuote> {
  if (fromAsset === toAsset) {
    throw new Error('[aerodrome] fromAsset and toAsset must differ');
  }

  const fromToken = tokenFor(fromAsset);
  const toToken = tokenFor(toAsset);
  const inDecimals = decimalsFor(fromAsset);
  const outDecimals = decimalsFor(toAsset);
  const amountInBaseUnits = parseUnits(amountIn, inDecimals);

  const { amountOut } = await stubQuote(amountInBaseUnits, fromAsset, toAsset, deps.pyth);

  const slippageBps = deps.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
  const minOutAmount = (amountOut * (10_000n - BigInt(slippageBps))) / 10_000n;
  const deadline = deps.now ? deps.now() + DEFAULT_DEADLINE_SECONDS : Math.floor(Date.now() / 1000) + DEFAULT_DEADLINE_SECONDS;

  const display = `${formatUnits(amountOut, outDecimals).slice(0, 8)} ${toAsset} for ${amountIn} ${fromAsset}`;
  const route = `${fromAsset}->${toAsset} (volatile)`;

  return {
    fromAsset,
    toAsset,
    amountInBaseUnits,
    amountOutBaseUnits: amountOut,
    display,
    route,
    fromToken,
    toToken,
    priceImpactBps: 0, // stub pricing has no impact
    slippageBps,
    minOutAmount,
    deadline,
  };
}
