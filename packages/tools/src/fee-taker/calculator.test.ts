import { describe, test, expect } from 'vitest';
import { calculateFee, buildFeeTransfer } from './calculator.js';

describe('Fee calculator', () => {
  test('calculates 0.1% fee', () => {
    const result = calculateFee(1000000000n, 10, '0x1234');
    expect(result.feeAmount).toBe(1000000n);
  });

  test('calculates 0.5% fee', () => {
    const result = calculateFee(1000000000n, 50, '0x1234');
    expect(result.feeAmount).toBe(5000000n);
  });

  test('handles zero fee', () => {
    const result = calculateFee(1000000000n, 0, '0x1234');
    expect(result.feeAmount).toBe(0n);
  });

  test('builds fee transfer', () => {
    const transfer = buildFeeTransfer('0xToken', 1000000n, '0xTreasury');
    expect(transfer.to).toBe('0xToken');
    expect(transfer.value).toBe(0n);
  });
});
