import type { MultisigConfig, MultisigTransaction } from './types.js';

export const MULTISIG_ABI = [
  {
    name: 'submitTransaction',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'confirmTransaction',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'transactionId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'executeTransaction',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'transactionId', type: 'uint256' }],
    outputs: [],
  },
] as const;

export async function createMultisig(
  config: MultisigConfig,
): Promise<{ address: `0x${string}`; txHash: string }> {
  if (config.threshold > config.signers.length) {
    throw new Error('multisig_threshold_exceeds_signers');
  }
  throw new Error('multisig_deployment_not_configured');
}

export async function getMultisigTransactions(
  _multisigAddress: `0x${string}`,
): Promise<MultisigTransaction[]> {
  return [];
}

export function buildSubmitCall(
  to: `0x${string}`,
  value: bigint,
  data: `0x${string}`,
): { to: `0x${string}`; data: `0x${string}`; value: bigint } {
  return { to, data, value };
}
