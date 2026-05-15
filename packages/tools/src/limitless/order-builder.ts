import type { LimitlessOrderParams } from './types.js';

export function buildBuyOrderCall(params: LimitlessOrderParams): {
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
} {
  // Stub: encode buy order call to Limitless contract
  return {
    to: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    data: '0x' as `0x${string}`,
    value: 0n,
  };
}
