import { describe, test, expect } from 'vitest';
import { calculateLeverage, calculateLiquidationPrice, estimateLeverageRisk } from './leverage.js';

describe('Leverage calculations', () => {
  test('calculateLeverage 2x', () => {
    const result = calculateLeverage(1000000000n, 2);
    expect(result.borrowAmount).toBe(1000000000n);
    expect(result.newCollateral).toBe(2000000000n);
  });

  test('calculateLeverage 3x', () => {
    const result = calculateLeverage(1000000000n, 3);
    expect(result.borrowAmount).toBe(2000000000n);
  });

  test('calculateLiquidationPrice', () => {
    const price = calculateLiquidationPrice(1000000000n, 2000000000n, 8000);
    expect(price).toBeGreaterThan(0n);
  });

  test('estimateLeverageRisk low', () => {
    expect(estimateLeverageRisk(2)).toBe('low');
  });

  test('estimateLeverageRisk extreme', () => {
    expect(estimateLeverageRisk(10)).toBe('extreme');
  });
});
