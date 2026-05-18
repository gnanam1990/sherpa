import { encodeFunctionData, createPublicClient, http, type Address } from 'viem';
import { base } from 'viem/chains';
import type { ProposalMetadata } from './types.js';

const AAVE_GOVERNOR_V3 = '0xc4025b326139768a5e8C3b42F1e5E1e4e63F4D2B';
const AAVE_TOKEN = '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9';

export const AAVE_GOV_ABI = [
  {
    name: 'submitVote',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'proposalId', type: 'uint256' },
      { name: 'support', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    name: 'submitVoteWithReason',
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
    name: 'getProposals',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'fromId', type: 'uint256' },
      { name: 'toId', type: 'uint256' },
      { name: 'excludeCanceled', type: 'bool' },
    ],
    outputs: [
      {
        type: 'tuple[]',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'creator', type: 'address' },
          { name: 'accessLevel', type: 'uint8' },
          { name: 'ipfsHash', type: 'bytes32' },
          { name: 'creationTime', type: 'uint256' },
          { name: 'cancellationTime', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'getProposalState',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

const PROPOSAL_CREATED_EVENT = {
  name: 'ProposalCreated',
  type: 'event',
  inputs: [
    { name: 'id', type: 'uint256', indexed: false },
    { name: 'creator', type: 'address', indexed: false },
    { name: 'targets', type: 'address[]', indexed: false },
    { name: 'values', type: 'uint256[]', indexed: false },
    { name: 'signatures', type: 'string[]', indexed: false },
    { name: 'calldatas', type: 'bytes[]', indexed: false },
    { name: 'startBlock', type: 'uint256', indexed: false },
    { name: 'endBlock', type: 'uint256', indexed: false },
    { name: 'description', type: 'string', indexed: false },
  ],
} as const;

const PROPOSAL_STATE_MAP: Record<number, ProposalMetadata['status']> = {
  0: 'pending',
  1: 'active',
  2: 'passed',
  3: 'passed',
  4: 'passed',
  5: 'rejected',
  6: 'rejected',
  7: 'executed',
};

export type GovernanceDeps = {
  rpcUrl?: string;
  readContract?: (params: any) => Promise<any>;
  getLogs?: (params: any) => Promise<any[]>;
  getBlockNumber?: () => Promise<bigint>;
};

const proposalCache = new Map<string, { data: ProposalMetadata[]; expires: number }>();
const CACHE_TTL_MS = 300_000; // 5 minutes

export async function getProposals(deps?: GovernanceDeps): Promise<ProposalMetadata[]> {
  const cacheKey = `aave-${AAVE_GOVERNOR_V3}`;
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
      : createPublicClient({ chain: base, transport: http(deps.rpcUrl) });

    const getLogs = deps.getLogs ?? ((params: any) => client!.getLogs(params));
    const getBlockNumber = deps.getBlockNumber ?? (() => client!.getBlockNumber());

    const latestBlock = await getBlockNumber();
    const fromBlock = latestBlock > 10000n ? latestBlock - 10000n : 0n;

    const logs = await getLogs({
      address: AAVE_GOVERNOR_V3 as Address,
      event: PROPOSAL_CREATED_EVENT,
      fromBlock,
      toBlock: latestBlock,
    });

    const proposals: ProposalMetadata[] = logs.map((log: any) => {
      const args = log.args ?? {};
      return {
        id: args.id?.toString() ?? '0',
        title: extractTitle(args.description ?? ''),
        description: args.description ?? '',
        proposer: (args.creator ?? '0x0000000000000000000000000000000000000000') as `0x${string}`,
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

function extractTitle(description: string): string {
  const firstLine = description.split('\n')[0] ?? '';
  return firstLine.slice(0, 100) || 'Untitled Proposal';
}

export function buildVoteTx(
  proposalId: string,
  support: 'yes' | 'no' | 'abstain',
  reason?: string,
): { to: `0x${string}`; data: `0x${string}`; value: bigint } {
  const supportNum = support === 'yes' ? 1 : support === 'no' ? 0 : 2;
  const to = AAVE_GOVERNOR_V3 as `0x${string}`;

  if (reason) {
    const data = encodeFunctionData({
      abi: AAVE_GOV_ABI,
      functionName: 'submitVoteWithReason',
      args: [BigInt(proposalId), supportNum, reason],
    });
    return { to, data, value: 0n };
  }

  const data = encodeFunctionData({
    abi: AAVE_GOV_ABI,
    functionName: 'submitVote',
    args: [BigInt(proposalId), supportNum],
  });
  return { to, data, value: 0n };
}

export function buildDelegateTx(
  delegatee: `0x${string}`,
): { to: `0x${string}`; data: `0x${string}`; value: bigint } {
  const data = encodeFunctionData({
    abi: AAVE_GOV_ABI,
    functionName: 'delegate',
    args: [delegatee],
  });
  return {
    to: AAVE_TOKEN as `0x${string}`,
    data,
    value: 0n,
  };
}

export const AAVE_GOV_ADDRESSES = {
  governor: AAVE_GOVERNOR_V3,
  token: AAVE_TOKEN,
} as const;
