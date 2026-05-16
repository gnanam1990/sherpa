import type { Address } from '@sherpa/safety';
import type { TokenInfo } from '../registry.js';

export type VelodromeAsset = 'USDC' | 'WETH' | 'OP' | 'USDT';

export type VelodromeParams = {
  amountIn: string;
  fromAsset: VelodromeAsset;
  toAsset: VelodromeAsset;
  recipient: Address;
  slippageBps?: number;
  deadline?: number;
};

export type VelodromeQuote = {
  fromAsset: VelodromeAsset;
  toAsset: VelodromeAsset;
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

export type VelodromeDeps = {
  routerAddress?: Address;
  quoterAddress?: Address;
  chainId?: number;
  slippageBps?: number;
  now?: () => number;
};

export const VELODROME_CHAIN_ID = 10;
export const DEFAULT_SLIPPAGE_BPS = 50;
export const DEFAULT_DEADLINE_SECONDS = 600;
