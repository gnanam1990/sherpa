import type { PolyForgeMarket } from './types.js';

export function buildPolyForgeOrder(_params: {
  market: PolyForgeMarket;
  side: 'YES' | 'NO';
  amount: bigint;
}): { to: `0x${string}`; data: `0x${string}`; value: bigint } {
  throw new Error('polyforge_order_builder_not_configured');
}
