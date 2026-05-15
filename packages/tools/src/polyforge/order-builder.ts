import type { PolyForgeMarket } from './types.js';

export function buildPolyForgeOrder(params: {
  market: PolyForgeMarket;
  side: 'YES' | 'NO';
  amount: bigint;
}): { to: `0x${string}`; data: `0x${string}`; value: bigint } {
  return {
    to: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    data: '0x' as `0x${string}`,
    value: 0n,
  };
}
