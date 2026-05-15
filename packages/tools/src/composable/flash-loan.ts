import type { FlashLoanParams, ComposableDeps } from './types.js';

export const FLASH_LOAN_ABI = [
  {
    name: 'flashLoan',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'receiverAddress', type: 'address' },
      { name: 'assets', type: 'address[]' },
      { name: 'amounts', type: 'uint256[]' },
      { name: 'modes', type: 'uint256[]' },
      { name: 'onBehalfOf', type: 'address' },
      { name: 'params', type: 'bytes' },
      { name: 'referralCode', type: 'uint16' },
    ],
    outputs: [],
  },
] as const;

export function buildFlashLoanCall(
  params: FlashLoanParams,
  receiver: `0x${string}`,
): { to: `0x${string}`; data: `0x${string}`; value: bigint } {
  return {
    to: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    data: '0x' as `0x${string}`,
    value: 0n,
  };
}

export function calculateFlashLoanFee(amount: bigint): bigint {
  // Aave charges 0.09% on flash loans
  return (amount * 9n) / 10000n;
}
