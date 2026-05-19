/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { encodeFunctionData, toFunctionSelector } from 'viem';
import { assertAllowlisted, type Address } from '@sherpa/safety';
import { quote, type VelodromeDeps } from './quoter.js';
import type { VelodromeAsset, VelodromeQuote } from './types.js';
import { VELODROME_CHAIN_ID } from './types.js';
import { resolveToken } from '../registry.js';

const VELODROME_ROUTER_ABI = [
  {
    type: 'function',
    name: 'swapExactTokensForTokens',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMin', type: 'uint256' },
      {
        name: 'routes',
        type: 'tuple[]',
        components: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'stable', type: 'bool' },
          { name: 'factory', type: 'address' },
        ],
      },
      { name: 'to', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
] as const;

export const SWAP_EXACT_TOKENS_SELECTOR = toFunctionSelector(VELODROME_ROUTER_ABI[0]);

function tokenAddressFor(asset: VelodromeAsset): Address {
  const token = resolveToken(asset, VELODROME_CHAIN_ID);
  if (!token || token.address === 'native') {
    return resolveToken('WETH', VELODROME_CHAIN_ID)!.address as Address;
  }
  return token.address as Address;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;

export type SwapBuildResult = {
  to: Address;
  data: `0x${string}`;
  value: bigint;
  sponsorable: boolean;
  quote: VelodromeQuote;
  route: { from: Address; to: Address; stable: boolean; factory: Address };
};

export async function buildSwapCall(
  fromAsset: VelodromeAsset,
  toAsset: VelodromeAsset,
  amountIn: string,
  recipient: Address,
  deps: VelodromeDeps = {},
): Promise<SwapBuildResult> {
  const routerAddress = deps.routerAddress ?? '0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858' as Address;
  const q = await quote(fromAsset, toAsset, amountIn, deps);

  const route = {
    from: tokenAddressFor(fromAsset),
    to: tokenAddressFor(toAsset),
    stable: false,
    factory: ZERO_ADDRESS,
  };

  const data = encodeFunctionData({
    abi: VELODROME_ROUTER_ABI,
    functionName: 'swapExactTokensForTokens',
    args: [q.amountInBaseUnits, q.minOutAmount, [route], recipient, BigInt(q.deadline)],
  });

  assertAllowlisted(routerAddress, [routerAddress]);

  return {
    to: routerAddress,
    data,
    value: 0n,
    sponsorable: true,
    quote: q,
    route,
  };
}
