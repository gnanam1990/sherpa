import type { LimitlessOrderParams } from './types.js';

export function buildBuyOrderCall(_params: LimitlessOrderParams): {
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
} {
  throw new Error('limitless_order_builder_not_configured');
}
