import type { FeeCalculation } from './types.js';

export function calculateFee(
  amount: bigint,
  feeBps: number,
  treasury: `0x${string}`,
): FeeCalculation {
  const feeAmount = (amount * BigInt(feeBps)) / 10000n;
  return {
    inputAmount: amount,
    feeAmount,
    feeBps,
    treasury,
  };
}

export function buildFeeTransfer(
  token: `0x${string}`,
  feeAmount: bigint,
  treasury: `0x${string}`,
): { to: `0x${string}`; data: `0x${string}`; value: bigint } {
  return {
    to: token,
    data: '0x' as `0x${string}`,
    value: 0n,
  };
}
