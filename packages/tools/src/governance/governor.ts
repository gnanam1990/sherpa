/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { encodeFunctionData } from 'viem';
import type { ProposalMetadata, VoteParams, GovernanceDeps } from './types.js';

export const GOVERNOR_ABI = [
  {
    name: 'castVote',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'support', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    name: 'propose',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'targets', type: 'address[]' },
      { name: 'values', type: 'uint256[]' },
      { name: 'signatures', type: 'string[]' },
      { name: 'calldatas', type: 'bytes[]' },
      { name: 'description', type: 'string' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'delegate',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'delegatee', type: 'address' }],
    outputs: [],
  },
] as const;

export async function listProposals(
  deps: GovernanceDeps,
): Promise<ProposalMetadata[]> {
  // On-chain proposal listing requires a live RPC call.
  // Snapshot integration provides real proposal data.
  void deps;
  return [];
}

export function buildVoteCall(params: VoteParams): {
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
} {
  const supportNum = params.support === 'yes' ? 1 : params.support === 'no' ? 0 : 2;
  const data = encodeFunctionData({
    abi: GOVERNOR_ABI,
    functionName: 'castVote',
    args: [BigInt(params.proposalId), supportNum],
  });
  return {
    to: params.governorAddress as `0x${string}`,
    data,
    value: 0n,
  };
}

export function buildDelegateCall(
  delegatee: `0x${string}`,
  tokenAddress: `0x${string}`,
): {
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
} {
  const data = encodeFunctionData({
    abi: GOVERNOR_ABI,
    functionName: 'delegate',
    args: [delegatee],
  });
  return {
    to: tokenAddress,
    data,
    value: 0n,
  };
}
