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

export async function getProposals(): Promise<ProposalMetadata[]> {
  return [
    {
      id: '7',
      title: 'RetroPGF Round 4 Allocation',
      description: 'Proposal for the allocation of RetroPGF Round 4 funding to public goods in the Optimism ecosystem.',
      proposer: '0x2a1b2a1b2a1b2a1b2a1b2a1b2a1b2a1b2a1b2a1b' as `0x${string}`,
      status: 'active',
      votesFor: '12000000',
      votesAgainst: '2000000',
      votesAbstain: '800000',
      quorum: '5000000',
      startTime: Date.now() - 86400000 * 3,
      endTime: Date.now() + 86400000 * 4,
    },
  ];
}

export function buildVoteTx(
  proposalId: string,
  support: 'yes' | 'no' | 'abstain',
  reason?: string,
): { to: `0x${string}`; data: `0x${string}`; value: bigint } {
  const supportNum = support === 'yes' ? 1 : support === 'no' ? 0 : 2;
  void proposalId;
  void supportNum;
  void reason;
  return {
    to: OPTIMISM_GOVERNOR as `0x${string}`,
    data: '0x' as `0x${string}`,
    value: 0n,
  };
}

export function buildDelegateTx(
  delegatee: `0x${string}`,
): { to: `0x${string}`; data: `0x${string}`; value: bigint } {
  void delegatee;
  return {
    to: OP_TOKEN as `0x${string}`,
    data: '0x' as `0x${string}`,
    value: 0n,
  };
}

export const OPTIMISM_GOV_ADDRESSES = {
  governor: OPTIMISM_GOVERNOR,
  token: OP_TOKEN,
} as const;
