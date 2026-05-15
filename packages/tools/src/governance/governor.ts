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
  void deps;
  return [
    {
      id: '1',
      title: 'Increase protocol fee to 0.2%',
      description:
        'Proposal to increase the protocol fee from 0.1% to 0.2% to fund development.',
      proposer: '0x0000000000000000000000000000000000000001',
      status: 'active',
      votesFor: '1000000',
      votesAgainst: '500000',
      votesAbstain: '100000',
      quorum: '2000000',
      startTime: Date.now() - 86400000,
      endTime: Date.now() + 86400000 * 6,
    },
    {
      id: '2',
      title: 'Add Polygon support',
      description: 'Proposal to add Polygon chain support for Sherpa.',
      proposer: '0x0000000000000000000000000000000000000002',
      status: 'passed',
      votesFor: '3000000',
      votesAgainst: '200000',
      votesAbstain: '50000',
      quorum: '2000000',
      startTime: Date.now() - 86400000 * 7,
      endTime: Date.now() - 86400000,
    },
  ];
}

export function buildVoteCall(params: VoteParams): {
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
} {
  void params;
  return {
    to: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    data: '0x' as `0x${string}`,
    value: 0n,
  };
}

export function buildDelegateCall(delegatee: `0x${string}`): {
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
} {
  void delegatee;
  return {
    to: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    data: '0x' as `0x${string}`,
    value: 0n,
  };
}
