import { describe, expect, test } from 'vitest';
import { buildBuyOrderCall } from './index.js';

describe('Limitless legacy order builder', () => {
  test('fails closed until a contract encoder is configured', () => {
    expect(() => buildBuyOrderCall({
      marketId: '0x1234',
      side: 'YES',
      amount: 100n,
    })).toThrow('limitless_order_builder_not_configured');
  });
});
