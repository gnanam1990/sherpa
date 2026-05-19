/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export const FEE_TAKER_ABI = [
  {
    name: 'collectFee',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'updateTreasury',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'newTreasury', type: 'address' }],
    outputs: [],
  },
  {
    name: 'updateFeeBps',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'newFeeBps', type: 'uint256' }],
    outputs: [],
  },
] as const;

export const FEE_TAKER_ADDRESSES: Record<number, `0x${string}` | undefined> = {
  8453: undefined,
  42161: undefined,
  10: undefined,
  137: undefined,
  43114: undefined,
};
