import { encodeFunctionData, toFunctionSelector } from 'viem';
import { assertAllowlisted, type Address } from '@sherpa/safety';
import { quote, type CamelotDeps } from './quoter.js';
import type { CamelotAsset, CamelotQuote } from './types.js';
import { CAMELOT_CHAIN_ID } from './types.js';
import { resolveToken } from '../registry.js';

const CAMELOT_ROUTER_ABI = [
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

export const SWAP_EXACT_TOKENS_SELECTOR = toFunctionSelector(CAMELOT_ROUTER_ABI[0]);

function tokenAddressFor(asset: CamelotAsset): Address {
  const token = resolveToken(asset, CAMELOT_CHAIN_ID);
  if (!token || token.address === 'native') {
    return resolveToken('WETH', CAMELOT_CHAIN_ID)!.address as Address;
  }
  return token.address as Address;
}

export type SwapBuildResult = {
  to: Address;
  data: `0x${string}`;
  value: bigint;
  sponsorable: boolean;
  quote: CamelotQuote;
  path: Address[];
};

export async function buildSwapCall(
  fromAsset: CamelotAsset,
  toAsset: CamelotAsset,
  amountIn: string,
  recipient: Address,
  deps: CamelotDeps = {},
): Promise<SwapBuildResult> {
  const routerAddress = deps.routerAddress ?? '0xc873fEcbd354f5A56E00E710B90EF4201db2448d' as Address;
  const q = await quote(fromAsset, toAsset, amountIn, deps);

  const path = [tokenAddressFor(fromAsset), tokenAddressFor(toAsset)];

  const data = encodeFunctionData({
    abi: CAMELOT_ROUTER_ABI,
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
