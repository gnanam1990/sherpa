import type { ProposalMetadata, VoteParams, DelegateParams } from './types.js';

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

const PROPOSAL_STATES = [
  'pending', 'active', 'canceled', 'defeated',
  'succeeded', 'queued', 'expired', 'executed',
] as const;

export async function getProposals(): Promise<ProposalMetadata[]> {
  return [
    {
      id: '42',
      title: 'Aave v3.1 Risk Parameters Update',
      description: 'Update risk parameters for Aave v3.1 markets including LTV and liquidation thresholds.',
      proposer: '0xADEB7920c7FF9b9E0e05A6dD55EB4cE0B3b2d9C5' as `0x${string}`,
      status: 'active',
      votesFor: '15000000',
      votesAgainst: '3000000',
      votesAbstain: '500000',
      quorum: '10000000',
      startTime: Date.now() - 86400000 * 2,
      endTime: Date.now() + 86400000 * 5,
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
    to: AAVE_GOVERNOR_V3 as `0x${string}`,
    data: '0x' as `0x${string}`,
    value: 0n,
  };
}

export function buildDelegateTx(
  delegatee: `0x${string}`,
): { to: `0x${string}`; data: `0x${string}`; value: bigint } {
  void delegatee;
  return {
    to: AAVE_TOKEN as `0x${string}`,
    data: '0x' as `0x${string}`,
    value: 0n,
  };
}

export const AAVE_GOV_ADDRESSES = {
  governor: AAVE_GOVERNOR_V3,
  token: AAVE_TOKEN,
} as const;
