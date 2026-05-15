import type { ZoraMintParams } from './types.js';

export function buildMintCall(params: ZoraMintParams): {
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
} {
  void params;
  return {
    to: params.collection,
    data: '0x' as `0x${string}`,
    value: 0n,
  };
}
