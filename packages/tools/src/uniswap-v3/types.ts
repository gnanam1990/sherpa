import type { Address } from '@sherpa/safety';

export type UniswapSwapParams = {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  fee: number; // 500, 3000, 10000
  recipient: Address;
  deadline: bigint;
};

export type UniswapSwapQuote = {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  amountOut: bigint;
  fee: number;
  display: string;
};

export type UniswapV3Deps = {
  routerAddress?: Address;
  quoterAddress?: Address;
};
