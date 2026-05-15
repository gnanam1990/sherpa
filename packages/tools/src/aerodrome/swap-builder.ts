import { encodeFunctionData, toFunctionSelector } from 'viem';
import { ALLOWED_CONTRACTS, AERODROME_ROUTER_ADDRESS, assertAllowlisted, type Address } from '@sherpa/safety';
import { quote, type QuoterDeps } from './quoter.js';
import type { AerodromeDeps, AerodromeQuote, AerodromeRoute, SwapAsset } from './types.js';
import { ZERO_ADDRESS } from './types.js';

import { AerodromeNotConfiguredError } from './quoter.js';

const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

/**
 * Aerodrome Router.swapExactTokensForTokens ABI fragment.
 * Route[] is (from, to, stable, factory).
 */
const AERODROME_ROUTER_ABI = [
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

export const SWAP_EXACT_TOKENS_SELECTOR = toFunctionSelector(AERODROME_ROUTER_ABI[0]);

function tokenAddressFor(asset: SwapAsset): Address {
  if (asset === 'ETH') return ALLOWED_CONTRACTS.WETH;
  return asset === 'USDC' ? ALLOWED_CONTRACTS.USDC : ALLOWED_CONTRACTS.WETH;
}

export type SwapBuildResult = {
  to: Address;
  data: `0x${string}`;
  value: bigint;
  sponsorable: boolean;
  quote: AerodromeQuote;
  route: AerodromeRoute;
};

/**
 * Build the calldata for an Aerodrome swap.
 *
 * Returns the full call (to, data, value) plus the quote and route metadata.
 * The caller (executor/planner) wraps this into ExecutionStep[].
 */
export async function buildSwapCall(
  fromAsset: SwapAsset,
  toAsset: SwapAsset,
  amountIn: string,
  recipient: Address,
  deps: AerodromeDeps & QuoterDeps = {},
): Promise<SwapBuildResult> {
  const routerAddress = deps.routerAddress ?? AERODROME_ROUTER_ADDRESS;
  if (!routerAddress) {
    throw new AerodromeNotConfiguredError();
  }

  const q = await quote(fromAsset, toAsset, amountIn, deps);
  const extras: readonly Address[] = [routerAddress];

  const route: AerodromeRoute = {
    from: tokenAddressFor(fromAsset),
    to: tokenAddressFor(toAsset),
    stable: false,
    factory: ZERO_ADDRESS,
  };

  const data = encodeFunctionData({
    abi: AERODROME_ROUTER_ABI,
    functionName: 'swapExactTokensForTokens',
    args: [q.amountInBaseUnits, q.minOutAmount, [route], recipient, BigInt(q.deadline)],
  });

  assertAllowlisted(routerAddress, extras);

  return {
    to: routerAddress,
    data,
    value: 0n,
    sponsorable: true,
    quote: q,
    route,
  };
}

export type SwapWithFeeResult = {
  calls: Array<{ to: Address; data: `0x${string}`; value: bigint }>;
  quote: AerodromeQuote;
  route: AerodromeRoute;
  sponsorable: boolean;
};

export async function buildSwapWithFee(
  fromAsset: SwapAsset,
  toAsset: SwapAsset,
  amountIn: string,
  recipient: Address,
  feeBps: number,
  treasuryAddress: Address,
  deps: AerodromeDeps & QuoterDeps = {},
): Promise<SwapWithFeeResult> {
  const result = await buildSwapCall(fromAsset, toAsset, amountIn, recipient, deps);

  const calls: Array<{ to: Address; data: `0x${string}`; value: bigint }> = [
    { to: result.to, data: result.data, value: result.value },
  ];

  if (feeBps > 0 && treasuryAddress) {
    const feeAmount = (result.quote.amountOutBaseUnits * BigInt(feeBps)) / 10000n;

    if (feeAmount > 0n) {
      const tokenAddress = tokenAddressFor(toAsset);
      const transferData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [treasuryAddress, feeAmount],
      });
      calls.push({
        to: tokenAddress,
        data: transferData,
        value: 0n,
      });
    }
  }

  return {
    calls,
    quote: result.quote,
    route: result.route,
    sponsorable: result.sponsorable,
  };
}
