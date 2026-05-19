/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { erc20Abi, formatUnits, type PublicClient } from 'viem';
import type { Address } from '@sherpa/safety';
import { resolveToken } from './registry.js';

export type BalanceSnapshot = {
  address: Address;
  ethWei: bigint;
  ethDisplay: string;
  usdcBaseUnits: bigint;
  usdcDisplay: string;
};

export type FetchBalanceOptions = {
  chainId?: number;
  usdcAddress?: Address;
};

/**
 * Read native + USDC balance for `address` using viem's multicall.
 *
 * Separating the tool from @sherpa/tools' direct exports keeps this file
 * opt-in: callers who don't need live RPC (tests, `pnpm build` in CI with no
 * network) can skip it.
 */
export async function fetchBalance(
  client: PublicClient,
  address: Address,
  options: FetchBalanceOptions = {},
): Promise<BalanceSnapshot> {
  const chainId = options.chainId ?? 84532;
  const usdc = options.usdcAddress ?? resolveToken('USDC', chainId)?.address;
  if (!usdc || usdc === 'native') {
    throw new Error(`USDC is not configured for chain ${chainId}`);
  }

  const [ethWei, usdcBaseUnits] = await Promise.all([
    client.getBalance({ address }),
    client.readContract({
      address: usdc,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address],
    }),
  ]);

  return {
    address,
    ethWei,
    ethDisplay: `${formatUnits(ethWei, 18)} ETH`,
    usdcBaseUnits,
    usdcDisplay: `$${formatUnits(usdcBaseUnits, 6)}`,
  };
}
