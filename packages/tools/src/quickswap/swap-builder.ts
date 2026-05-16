import { encodeFunctionData, toFunctionSelector } from 'viem';
import { assertAllowlisted, type Address } from '@sherpa/safety';
import { quote, type QuickSwapDeps } from './quoter.js';
import type { QuickSwapAsset, QuickSwapQuote } from './types.js';
import { DEFAULT_SLIPPAGE_BPS, QUICKSWAP_CHAIN_ID } from './types.js';
import { resolveToken } from '../registry.js';

const QUICKSWAP_ROUTER_ABI = [
  {
    type: 'function',
    name: 'swapExactTokensForTokens',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
] as const;

export const SWAP_EXACT_TOKENS_SELECTOR = toFunctionSelector(QUICKSWAP_ROUTER_ABI[0]);

function tokenAddressFor(asset: QuickSwapAsset): Address {
  const token = resolveToken(asset, QUICKSWAP_CHAIN_ID);
  if (!token || token.address === 'native') {
    return resolveToken('WMATIC', QUICKSWAP_CHAIN_ID)!.address as Address;
  }
  return token.address as Address;
}

export type SwapBuildResult = {
  to: Address;
  data: `0x${string}`;
  value: bigint;
  sponsorable: boolean;
  quote: QuickSwapQuote;
  path: Address[];
};

export async function buildSwapCall(
  fromAsset: QuickSwapAsset,
  toAsset: QuickSwapAsset,
  amountIn: string,
  recipient: Address,
  deps: QuickSwapDeps = {},
): Promise<SwapBuildResult> {
  const routerAddress = deps.routerAddress ?? '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff' as Address;
  const q = await quote(fromAsset, toAsset, amountIn, deps);

  const path = [tokenAddressFor(fromAsset), tokenAddressFor(toAsset)];

  const data = encodeFunctionData({
    abi: QUICKSWAP_ROUTER_ABI,
    functionName: 'swapExactTokensForTokens',
    args: [q.amountInBaseUnits, q.minOutAmount, path, recipient, BigInt(q.deadline)],
  });

  assertAllowlisted(routerAddress, [routerAddress]);

  return {
    to: routerAddress,
    data,
    value: 0n,
    sponsorable: true,
    quote: q,
    path,
  };
}
