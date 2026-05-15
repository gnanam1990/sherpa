import type { TipParams, TipQuote } from './types.js';

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
