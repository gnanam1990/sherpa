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
import type { VelodromeAsset, VelodromeDeps, VelodromeQuote } from './types.js';
import { DEFAULT_SLIPPAGE_BPS, DEFAULT_DEADLINE_SECONDS, VELODROME_CHAIN_ID } from './types.js';
export type { VelodromeDeps } from './types.js';

export class VelodromeNotConfiguredError extends Error {
  constructor() {
    super('Velodrome router address not configured');
    this.name = 'VelodromeNotConfiguredError';
  }
}

export class TokenNotFoundError extends Error {
  constructor(symbol: string) {
    super(`Token ${symbol} not found in Optimism registry`);
    this.name = 'TokenNotFoundError';
  }
}

const STUB_PRICE_FRACTIONS: Record<string, [number, number]> = {
  'USDC:WETH': [1, 3000],
  'WETH:USDC': [3000, 1],
  'USDC:OP': [2, 5],
  'OP:USDC': [5, 2],
  'USDC:USDT': [1, 1],
  'USDT:USDC': [1, 1],
  'WETH:OP': [1200, 1],
  'OP:WETH': [1, 1200],
  'WETH:USDT': [3000, 1],
  'USDT:WETH': [1, 3000],
  'OP:USDT': [5, 2],
  'USDT:OP': [2, 5],
};

function decimalsFor(asset: VelodromeAsset): number {
  if (asset === 'USDC' || asset === 'USDT') return 6;
  return 18;
}

function tokenFor(asset: VelodromeAsset): TokenInfo {
  const token = resolveToken(asset, VELODROME_CHAIN_ID);
  if (!token) throw new TokenNotFoundError(asset);
  return token;
}

export async function quote(
  fromAsset: VelodromeAsset,
  toAsset: VelodromeAsset,
  amountIn: string,
  deps: VelodromeDeps = {},
): Promise<VelodromeQuote> {
  if (fromAsset === toAsset) {
    throw new Error('[velodrome] fromAsset and toAsset must differ');
  }

  const fromToken = tokenFor(fromAsset);
  const toToken = tokenFor(toAsset);
  const inDecimals = decimalsFor(fromAsset);
  const outDecimals = decimalsFor(toAsset);
  const amountInBaseUnits = parseUnits(amountIn, inDecimals);

  const priceKey = `${fromAsset}:${toAsset}`;
  const [priceNum, priceDen] = STUB_PRICE_FRACTIONS[priceKey] ?? [1, 1];
  let amountOut = (amountInBaseUnits * BigInt(priceNum)) / BigInt(priceDen);
  if (outDecimals > inDecimals) {
    amountOut *= 10n ** BigInt(outDecimals - inDecimals);
  } else if (outDecimals < inDecimals) {
    amountOut /= 10n ** BigInt(inDecimals - outDecimals);
  }

  const slippageBps = deps.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
  const minOutAmount = (amountOut * (10_000n - BigInt(slippageBps))) / 10_000n;
  const deadline = deps.now ? deps.now() + DEFAULT_DEADLINE_SECONDS : Math.floor(Date.now() / 1000) + DEFAULT_DEADLINE_SECONDS;

  const display = `${formatUnits(amountOut, outDecimals).slice(0, 8)} ${toAsset} for ${amountIn} ${fromAsset}`;
  const route = `${fromAsset}->${toAsset} (velodrome)`;

  return {
    fromAsset,
    toAsset,
    amountInBaseUnits,
    amountOutBaseUnits: amountOut,
    display,
    route,
    fromToken,
    toToken,
    priceImpactBps: 0,
    slippageBps,
    minOutAmount,
    deadline,
  };
}
