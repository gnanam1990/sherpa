import { encodeFunctionData, type PublicClient } from 'viem';
import { assertAllowlisted, type Address } from '@sherpa/safety';
import type { ToolAdapter, BuiltTx } from '../types.js';
import type { UniswapSwapParams, UniswapSwapQuote, UniswapV3Deps } from './types.js';

export type { UniswapSwapParams, UniswapSwapQuote, UniswapV3Deps } from './types.js';

export const UNISWAP_V3_ROUTERS: Record<number, Address> = {
  42161: '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Arbitrum
  10: '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Optimism
};

export const UNISWAP_V3_QUOTERS: Record<number, Address> = {
  42161: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e', // Arbitrum
  10: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e', // Optimism
};

const QUOTER_V2_ABI = [
  {
    type: 'function',
    name: 'quoteExactInputSingle',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'fee', type: 'uint24' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
    ],
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'sqrtPriceX96After', type: 'uint160' },
      { name: 'initializedTicksCrossed', type: 'uint32' },
      { name: 'gasEstimate', type: 'uint256' },
    ],
  },
] as const;

const SWAP_ROUTER_ABI = [
  {
    type: 'function',
    name: 'exactInputSingle',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'recipient', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMinimum', type: 'uint256' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
] as const;

export type UniswapV3Adapter = ToolAdapter<UniswapSwapParams, UniswapSwapQuote, UniswapSwapParams> & {
  routerAddress: Address | undefined;
  quoterAddress: Address | undefined;
};

export function getUniswapV3Router(chainId: number): Address | undefined {
  return UNISWAP_V3_ROUTERS[chainId];
}

export function getUniswapV3Quoter(chainId: number): Address | undefined {
  return UNISWAP_V3_QUOTERS[chainId];
}

export function createUniswapV3(
  deps: UniswapV3Deps & { chainId?: number; client?: PublicClient } = {},
): UniswapV3Adapter {
  const routerAddress = deps.routerAddress ?? (deps.chainId != null ? UNISWAP_V3_ROUTERS[deps.chainId] : undefined);
  const quoterAddress = deps.quoterAddress ?? (deps.chainId != null ? UNISWAP_V3_QUOTERS[deps.chainId] : undefined);

  const quote = async (params: UniswapSwapParams): Promise<UniswapSwapQuote> => {
    if (!quoterAddress) {
      throw new Error('[uniswap-v3] quoter address not configured');
    }

    if (!deps.client) {
      throw new Error('[uniswap-v3] public client not configured');
    }

    const result = (await deps.client.simulateContract({
      address: quoterAddress,
      abi: QUOTER_V2_ABI,
      functionName: 'quoteExactInputSingle',
      args: [
        {
          tokenIn: params.tokenIn,
          tokenOut: params.tokenOut,
          amountIn: params.amountIn,
          fee: params.fee,
          sqrtPriceLimitX96: 0n,
        },
      ],
    })) as unknown as { result: readonly [bigint, bigint, number, bigint] };
    const amountOut = result.result[0];

    return {
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amountIn: params.amountIn,
      amountOut,
      fee: params.fee,
      display: `Swap ${params.amountIn} for ${amountOut}`,
    };
  };

  const buildTx = async (params: UniswapSwapParams): Promise<BuiltTx> => {
    if (!routerAddress) {
      throw new Error('[uniswap-v3] router address not configured');
    }

    const q = await quote(params);
    const slippageBps = 50n; // 0.5%
    const amountOutMinimum = (q.amountOut * (10_000n - slippageBps)) / 10_000n;

    const data = encodeFunctionData({
      abi: SWAP_ROUTER_ABI,
      functionName: 'exactInputSingle',
      args: [
        {
          tokenIn: params.tokenIn,
          tokenOut: params.tokenOut,
          fee: params.fee,
          recipient: params.recipient,
          amountIn: params.amountIn,
          amountOutMinimum,
          sqrtPriceLimitX96: 0n,
        },
      ],
    });

    const tx: BuiltTx = {
      to: routerAddress,
      data,
      value: 0n,
      sponsorable: true,
    };
    assertAllowlisted(tx.to);
    return tx;
  };

  const verify = async (tx: BuiltTx) => {
    if (!routerAddress) {
      return { ok: false as const, reason: 'router address not configured' };
    }
    if (tx.to.toLowerCase() !== routerAddress.toLowerCase()) {
      return { ok: false as const, reason: 'target is not Uniswap V3 router' };
    }
    if (tx.value !== 0n) {
      return { ok: false as const, reason: 'swap via ERC20 must have value=0' };
    }
    if (!tx.data.startsWith('0x04e45aaf')) {
      return { ok: false as const, reason: 'calldata is not exactInputSingle' };
    }
    return { ok: true as const };
  };

  return {
    name: 'uniswap-v3',
    routerAddress,
    quoterAddress,
    quote,
    buildTx,
    verify,
  };
}

export const uniswapV3 = createUniswapV3();
