import { describe, test, expect } from 'vitest';
import { calculateRepayAmount } from './auto-repay-runner.js';

describe('Auto-repay runner', () => {
  test('calculateRepayAmount returns partial amount', () => {
    const amount = calculateRepayAmount(1.5, 1.2, '1000000000');
    expect(amount).toBeGreaterThan(0n);
    expect(amount).toBeLessThanOrEqual(BigInt('1000000000'));
  });

  test('calculateRepayAmount caps at max', () => {
    const amount = calculateRepayAmount(10.0, 1.2, '100');
    expect(amount).toBeLessThanOrEqual(BigInt('100'));
  });

  test('calculateRepayAmount returns 0 when HF equals target', () => {
    const amount = calculateRepayAmount(1.5, 1.5, '1000000000');
    expect(amount).toBe(0n);
  });
});
