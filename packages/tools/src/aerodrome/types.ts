import type { Address } from '@sherpa/safety';
import type { TokenInfo } from '../registry.js';

export type SwapAsset = 'USDC' | 'ETH';

export type SwapParams = {
  amountIn: string;
  fromAsset: SwapAsset;
  toAsset: SwapAsset;
  recipient: Address;
  slippageBps?: number;
  deadline?: number;
};

export type SwapQuote = {
  fromAsset: SwapAsset;
  toAsset: SwapAsset;
  amountInBaseUnits: bigint;
  amountOutBaseUnits: bigint;
  display: string;
  route: string;
};

/** Extended quote with token-registry info for the planner. */
export type AerodromeQuote = SwapQuote & {
  fromToken: TokenInfo;
  toToken: TokenInfo;
  priceImpactBps: number;
  slippageBps: number;
  minOutAmount: bigint;
  deadline: number;
};

export type AerodromeRoute = {
  from: Address;
  to: Address;
  stable: boolean;
  factory: Address;
};

export type AerodromeDeps = {
  routerAddress?: Address;
  quoterAddress?: Address;
  pyth?: import('./stub-pricing.js').PythConfig | false;
  now?: () => number;
};

export type SwapFeeConfig = {
  feeBps: number;
  treasuryAddress: Address;
};

export const DEFAULT_SLIPPAGE_BPS = 50;
export const DEFAULT_DEADLINE_SECONDS = 600;
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;
