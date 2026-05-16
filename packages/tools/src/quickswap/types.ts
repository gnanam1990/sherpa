import type { Address } from '@sherpa/safety';
import type { TokenInfo } from '../registry.js';

export type QuickSwapAsset = 'USDC' | 'WETH' | 'WMATIC' | 'USDT';

export type QuickSwapParams = {
  amountIn: string;
  fromAsset: QuickSwapAsset;
  toAsset: QuickSwapAsset;
  recipient: Address;
  slippageBps?: number;
  deadline?: number;
};

export type QuickSwapQuote = {
  fromAsset: QuickSwapAsset;
  toAsset: QuickSwapAsset;
  amountInBaseUnits: bigint;
  amountOutBaseUnits: bigint;
  display: string;
  route: string;
  fromToken: TokenInfo;
  toToken: TokenInfo;
  priceImpactBps: number;
  slippageBps: number;
  minOutAmount: bigint;
  deadline: number;
};

export type QuickSwapDeps = {
  routerAddress?: Address;
  quoterAddress?: Address;
  chainId?: number;
  slippageBps?: number;
  now?: () => number;
};

export const QUICKSWAP_CHAIN_ID = 137;
export const DEFAULT_SLIPPAGE_BPS = 50;
export const DEFAULT_DEADLINE_SECONDS = 600;
