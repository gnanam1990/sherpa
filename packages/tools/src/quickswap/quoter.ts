import { formatUnits, parseUnits } from 'viem';
import { resolveToken, type TokenInfo } from '../registry.js';
import type { QuickSwapAsset, QuickSwapDeps, QuickSwapQuote } from './types.js';
import { DEFAULT_SLIPPAGE_BPS, DEFAULT_DEADLINE_SECONDS, QUICKSWAP_CHAIN_ID } from './types.js';
export type { QuickSwapDeps } from './types.js';

export class QuickSwapNotConfiguredError extends Error {
  constructor() {
    super('QuickSwap router address not configured');
    this.name = 'QuickSwapNotConfiguredError';
  }
}

export class TokenNotFoundError extends Error {
  constructor(symbol: string) {
    super(`Token ${symbol} not found in Polygon registry`);
    this.name = 'TokenNotFoundError';
  }
}

// Prices as exact fractions [numerator, denominator] to avoid float imprecision
const STUB_PRICE_FRACTIONS: Record<string, [number, number]> = {
  'USDC:WETH': [1, 3000],
  'WETH:USDC': [3000, 1],
  'USDC:WMATIC': [2, 1],
  'WMATIC:USDC': [1, 2],
  'USDC:USDT': [1, 1],
  'USDT:USDC': [1, 1],
  'WETH:WMATIC': [6000, 1],
  'WMATIC:WETH': [1, 6000],
  'WETH:USDT': [3000, 1],
  'USDT:WETH': [1, 3000],
  'WMATIC:USDT': [1, 2],
  'USDT:WMATIC': [2, 1],
};

function decimalsFor(asset: QuickSwapAsset): number {
  if (asset === 'USDC' || asset === 'USDT') return 6;
  return 18;
}

function tokenFor(asset: QuickSwapAsset): TokenInfo {
  const token = resolveToken(asset, QUICKSWAP_CHAIN_ID);
  if (!token) throw new TokenNotFoundError(asset);
  return token;
}

export async function quote(
  fromAsset: QuickSwapAsset,
  toAsset: QuickSwapAsset,
  amountIn: string,
  deps: QuickSwapDeps = {},
): Promise<QuickSwapQuote> {
  if (fromAsset === toAsset) {
    throw new Error('[quickswap] fromAsset and toAsset must differ');
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
  const route = `${fromAsset}->${toAsset} (quickswap)`;

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
