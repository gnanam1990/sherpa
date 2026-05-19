/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { encodeFunctionData, createPublicClient, http, type Address } from 'viem';
import { optimism } from 'viem/chains';
import type { ProposalMetadata } from './types.js';

const OPTIMISM_GOVERNOR = '0xcDF27F1077cAD0D0A5DF56f8Ec97687B78a89EE4';
const OP_TOKEN = '0x4200000000000000000000000000000000000042';

export const OPTIMISM_GOV_ABI = [
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
    name: 'castVoteWithReason',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'support', type: 'uint8' },
      { name: 'reason', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'delegate',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'delegatee', type: 'address' }],
    outputs: [],
  },
  {
    name: 'proposals',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'proposer', type: 'address' },
      { name: 'eta', type: 'uint256' },
      { name: 'startBlock', type: 'uint256' },
      { name: 'endBlock', type: 'uint256' },
      { name: 'forVotes', type: 'uint256' },
      { name: 'againstVotes', type: 'uint256' },
      { name: 'abstainVotes', type: 'uint256' },
      { name: 'canceled', type: 'bool' },
      { name: 'executed', type: 'bool' },
    ],
  },
  {
    name: 'state',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'delegateBySig',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'delegatee', type: 'address' },
      { name: 'nonce', type: 'uint256' },
      { name: 'expiry', type: 'uint256' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    outputs: [],
  },
] as const;

const PROPOSAL_CREATED_EVENT = {
  name: 'ProposalCreated',
  type: 'event',
  inputs: [
    { name: 'id', type: 'uint256', indexed: true },
    { name: 'proposer', type: 'address', indexed: false },
    { name: 'targets', type: 'address[]', indexed: false },
    { name: 'values', type: 'uint256[]', indexed: false },
    { name: 'signatures', type: 'string[]', indexed: false },
    { name: 'calldatas', type: 'bytes[]', indexed: false },
    { name: 'startBlock', type: 'uint256', indexed: false },
    { name: 'endBlock', type: 'uint256', indexed: false },
    { name: 'description', type: 'string', indexed: false },
  ],
} as const;

export type OptimismGovernanceDeps = {
  rpcUrl?: string;
  getLogs?: (params: any) => Promise<any[]>;
  getBlockNumber?: () => Promise<bigint>;
};

const proposalCache = new Map<string, { data: ProposalMetadata[]; expires: number }>();
const CACHE_TTL_MS = 300_000;

export async function getProposals(deps?: OptimismGovernanceDeps): Promise<ProposalMetadata[]> {
  const cacheKey = `optimism-${OPTIMISM_GOVERNOR}`;
  const cached = proposalCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  if (!deps?.rpcUrl && !deps?.getLogs) {
    return [];
  }

  try {
    const client = deps.getLogs
      ? null
      : createPublicClient({ chain: optimism, transport: http(deps.rpcUrl) });

    const getLogs = deps.getLogs ?? ((params: any) => client!.getLogs(params));
    const getBlockNumber = deps.getBlockNumber ?? (() => client!.getBlockNumber());

    const latestBlock = await getBlockNumber();
    const fromBlock = latestBlock > 10000n ? latestBlock - 10000n : 0n;

    const logs = await getLogs({
      address: OPTIMISM_GOVERNOR as Address,
      event: PROPOSAL_CREATED_EVENT,
      fromBlock,
      toBlock: latestBlock,
    });

    const proposals: ProposalMetadata[] = logs.map((log: any) => {
      const args = log.args ?? {};
      return {
        id: args.id?.toString() ?? '0',
        title: (args.description ?? '').split('\n')[0]?.slice(0, 100) || 'Untitled',
        description: args.description ?? '',
        proposer: (args.proposer ?? '0x0000000000000000000000000000000000000000') as `0x${string}`,
        status: 'active',
        votesFor: '0',
        votesAgainst: '0',
        votesAbstain: '0',
        quorum: '0',
        startTime: Number(args.startBlock ?? 0),
        endTime: Number(args.endBlock ?? 0),
      };
    });

    proposalCache.set(cacheKey, { data: proposals, expires: Date.now() + CACHE_TTL_MS });
    return proposals;
  } catch {
    return [];
  }
}

export function buildVoteTx(
  proposalId: string,
  support: 'yes' | 'no' | 'abstain',
  reason?: string,
): { to: `0x${string}`; data: `0x${string}`; value: bigint } {
  const supportNum = support === 'yes' ? 1 : support === 'no' ? 0 : 2;
  const to = OPTIMISM_GOVERNOR as `0x${string}`;

  if (reason) {
    const data = encodeFunctionData({
      abi: OPTIMISM_GOV_ABI,
      functionName: 'castVoteWithReason',
      args: [BigInt(proposalId), supportNum, reason],
    });
    return { to, data, value: 0n };
  }

  const data = encodeFunctionData({
    abi: OPTIMISM_GOV_ABI,
    functionName: 'castVote',
    args: [BigInt(proposalId), supportNum],
  });
  return { to, data, value: 0n };
}

export function buildDelegateTx(
  delegatee: `0x${string}`,
): { to: `0x${string}`; data: `0x${string}`; value: bigint } {
  const data = encodeFunctionData({
    abi: OPTIMISM_GOV_ABI,
    functionName: 'delegate',
    args: [delegatee],
  });
  return {
    to: OP_TOKEN as `0x${string}`,
    data,
    value: 0n,
  };
}

export const OPTIMISM_GOV_ADDRESSES = {
  governor: OPTIMISM_GOVERNOR,
  token: OP_TOKEN,
} as const;
