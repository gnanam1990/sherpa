import { encodeFunctionData, type Address } from 'viem';
import type { TipParams, TipQuote } from './types.js';

const ERC20_TRANSFER_ABI = {
  name: 'transfer',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'to', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ],
  outputs: [{ name: '', type: 'bool' }],
} as const;

export function buildTipCall(params: TipParams, recipientAddress: `0x${string}` | null): TipQuote {
  if (!recipientAddress) {
    return {
      recipientAddress: null,
      amount: params.amount,
      asset: params.asset,
    };
  }

  return {
    recipientAddress,
    amount: params.amount,
    asset: params.asset,
  };
}
