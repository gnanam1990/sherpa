import { describe, test, expect } from 'vitest';
import { assessPortfolioRisk, getExposureBreakdown, calculateRiskScore } from './assessor.js';

describe('Risk assessor', () => {
  test('assessPortfolioRisk returns risk assessment', async () => {
    const risk = await assessPortfolioRisk('0x1234', { chainId: 8453 });
    expect(risk.overallRisk).toBeDefined();
    expect(risk.riskScore).toBeGreaterThanOrEqual(0);
    expect(risk.factors.length).toBeGreaterThan(0);
  });

  test('getExposureBreakdown returns breakdown', async () => {
    const exposure = await getExposureBreakdown('0x1234', { chainId: 8453 });
    expect(exposure.byChain).toBeDefined();
    expect(exposure.byProtocol).toBeDefined();
  });

  test('calculateRiskScore returns score 0-100', () => {
    const score = calculateRiskScore([
      { severity: 'high' },
      { severity: 'medium' },
      { severity: 'low' },
    ]);
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeGreaterThan(0);
  });
});
