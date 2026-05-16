import type { ProposalMetadata } from './types.js';

const COMPOUND_GOVERNOR_BRAVO = '0xc0Da02939E1441F497fd74F78cE7Decb17B66529';
const COMPOUND_TOKEN = '0xc00e94Cb662C3520282E6f5717214004A7f26888';

export const COMPOUND_GOV_ABI = [
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
    name: 'proposalCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export async function getProposals(): Promise<ProposalMetadata[]> {
  return [
    {
      id: '118',
      title: 'Compound Treasury Rate Adjustment',
      description: 'Adjust Compound Treasury interest rates to align with current market conditions.',
      proposer: '0x683A78bA1f6b25E29fbBC9Cd1BFA29A51520De84' as `0x${string}`,
      status: 'active',
      votesFor: '8000000',
      votesAgainst: '1200000',
      votesAbstain: '300000',
      quorum: '4000000',
      startTime: Date.now() - 86400000,
      endTime: Date.now() + 86400000 * 3,
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
    to: COMPOUND_GOVERNOR_BRAVO as `0x${string}`,
    data: '0x' as `0x${string}`,
    value: 0n,
  };
}

export function buildDelegateTx(
  delegatee: `0x${string}`,
): { to: `0x${string}`; data: `0x${string}`; value: bigint } {
  void delegatee;
  return {
    to: COMPOUND_TOKEN as `0x${string}`,
    data: '0x' as `0x${string}`,
    value: 0n,
  };
}

export const COMPOUND_GOV_ADDRESSES = {
  governor: COMPOUND_GOVERNOR_BRAVO,
  token: COMPOUND_TOKEN,
} as const;
