import { describe, test, expect } from 'vitest';
import { calculatePnl } from './pnl.js';

describe('P&L calculation', () => {
  test('calculates positive P&L', () => {
    const result = calculatePnl(5000000000n, 4000000000n);
    expect(result.pnlUsd).toBe(1000000000n);
    expect(result.pnlPercent).toBe(25);
  });

  test('calculates negative P&L', () => {
    const result = calculatePnl(3000000000n, 4000000000n);
    expect(result.pnlUsd).toBe(-1000000000n);
    expect(result.pnlPercent).toBe(-25);
  });

  test('handles zero cost basis', () => {
    const result = calculatePnl(1000000000n, 0n);
    expect(result.pnlPercent).toBe(0);
  });
});
