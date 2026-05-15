import { describe, it, expect } from 'vitest';
import { computeHealthFactor, computePostBorrowHealthFactor, healthFactorRiskLevel } from './health-factor.js';

describe('computeHealthFactor', () => {
  it('returns Infinity when no debt', () => {
    expect(computeHealthFactor(1_000_000n, 0n, 8000)).toBe(Infinity);
  });

  it('computes HF correctly for simple case', () => {
    // 1000 USDC collateral, 500 USDC debt, 80% liquidation threshold
    // HF = (1000 * 0.8) / 500 = 1.6
    const hf = computeHealthFactor(1_000_000_000n, 500_000_000n, 8000);
    expect(hf).toBeCloseTo(1.6, 2);
  });

  it('computes HF < 1 for dangerous position', () => {
    // 1000 collateral, 900 debt, 80% threshold
    // HF = (1000 * 0.8) / 900 = 0.889
    const hf = computeHealthFactor(1_000_000_000n, 900_000_000n, 8000);
    expect(hf).toBeLessThan(1);
  });

  it('handles zero collateral', () => {
    const hf = computeHealthFactor(0n, 1_000_000_000n, 8000);
    expect(hf).toBe(0);
  });
});

describe('computePostBorrowHealthFactor', () => {
  it('HF decreases after additional borrow', () => {
    const currentData = {
      totalCollateralBase: 1_000_000_000n,
      totalDebtBase: 500_000_000n,
      availableBorrowsBase: 300_000_000n,
      currentLiquidationThreshold: 8000,
      ltv: 7500,
      healthFactor: 1_600_000_000_000_000_000n,
    };
    const newHf = computePostBorrowHealthFactor(currentData, 200_000_000n);
    expect(newHf).toBeLessThan(1.6);
  });
});

describe('healthFactorRiskLevel', () => {
  it('returns danger for HF < 1.1', () => {
    expect(healthFactorRiskLevel(1.05)).toBe('danger');
  });

  it('returns warning for 1.1 <= HF < 1.5', () => {
    expect(healthFactorRiskLevel(1.3)).toBe('warning');
  });

  it('returns safe for HF >= 1.5', () => {
    expect(healthFactorRiskLevel(2.0)).toBe('safe');
  });
});
