import { encodeFunctionData } from 'viem';
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

export async function getProposals(): Promise<ProposalMetadata[]> {
  // On-chain proposal reading requires a live RPC call to the Aave Governor contract.
  // Snapshot integration provides real proposal data. Return empty here until
  // a readContract dependency is injected.
  return [];
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
