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
import type { CamelotAsset, CamelotDeps, CamelotQuote } from './types.js';
import { DEFAULT_SLIPPAGE_BPS, DEFAULT_DEADLINE_SECONDS, CAMELOT_CHAIN_ID } from './types.js';
export type { CamelotDeps } from './types.js';

export class CamelotNotConfiguredError extends Error {
  constructor() {
    super('Camelot router address not configured');
    this.name = 'CamelotNotConfiguredError';
  }
}

export class TokenNotFoundError extends Error {
  constructor(symbol: string) {
    super(`Token ${symbol} not found in Arbitrum registry`);
    this.name = 'TokenNotFoundError';
  }
}

const STUB_PRICE_FRACTIONS: Record<string, [number, number]> = {
  'USDC:WETH': [1, 3000],
  'WETH:USDC': [3000, 1],
  'USDC:ARB': [5, 6],
  'ARB:USDC': [6, 5],
  'USDC:USDT': [1, 1],
  'USDT:USDC': [1, 1],
  'USDC:WBTC': [1, 60000],
  'WBTC:USDC': [60000, 1],
  'WETH:ARB': [2500, 1],
  'ARB:WETH': [1, 2500],
  'WETH:USDT': [3000, 1],
  'USDT:WETH': [1, 3000],
  'WETH:WBTC': [1, 20],
  'WBTC:WETH': [20, 1],
  'ARB:USDT': [6, 5],
  'USDT:ARB': [5, 6],
  'ARB:WBTC': [1, 50000],
  'WBTC:ARB': [50000, 1],
  'USDT:WBTC': [1, 60000],
  'WBTC:USDT': [60000, 1],
};

function decimalsFor(asset: CamelotAsset): number {
  if (asset === 'USDC' || asset === 'USDT') return 6;
  if (asset === 'WBTC') return 8;
  return 18;
}

function tokenFor(asset: CamelotAsset): TokenInfo {
  const token = resolveToken(asset, CAMELOT_CHAIN_ID);
  if (!token) throw new TokenNotFoundError(asset);
  return token;
}

export async function quote(
  fromAsset: CamelotAsset,
  toAsset: CamelotAsset,
  amountIn: string,
  deps: CamelotDeps = {},
): Promise<CamelotQuote> {
  if (fromAsset === toAsset) {
    throw new Error('[camelot] fromAsset and toAsset must differ');
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
  const route = `${fromAsset}->${toAsset} (camelot)`;

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
