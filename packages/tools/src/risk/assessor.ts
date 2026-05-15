import type { PortfolioRisk, ExposureBreakdown, RiskDeps } from './types.js';

export async function assessPortfolioRisk(
  address: `0x${string}`,
  _deps: RiskDeps,
): Promise<PortfolioRisk> {
  return {
    address,
    overallRisk: 'medium',
    riskScore: 45,
    factors: [
      {
        type: 'concentration',
        severity: 'medium',
        description: 'High concentration in single asset (ETH)',
        impact: '60% of portfolio in ETH',
        mitigation: 'Diversify into stablecoins or other assets',
      },
      {
        type: 'protocol',
        severity: 'low',
        description: 'Funds spread across multiple protocols',
        impact: 'Reduced smart contract risk',
      },
    ],
    recommendations: [
      'Consider diversifying ETH holdings',
      'Set up auto-repay for Aave positions',
      'Enable risk alerts for health factor drops',
    ],
  };
}

export async function getExposureBreakdown(
  _address: `0x${string}`,
  _deps: RiskDeps,
): Promise<ExposureBreakdown> {
  return {
    byChain: {
      Base: { value: 3000000000n, percent: 60 },
      Arbitrum: { value: 2000000000n, percent: 40 },
    },
    byProtocol: {
      Aave: { value: 2000000000n, percent: 40 },
      Aerodrome: { value: 1500000000n, percent: 30 },
      Wallet: { value: 1500000000n, percent: 30 },
    },
    byAsset: {
      ETH: { value: 3000000000n, percent: 60 },
      USDC: { value: 2000000000n, percent: 40 },
    },
    maxSingleExposure: { name: 'ETH', value: 3000000000n, percent: 60 },
  };
}

export function calculateRiskScore(factors: Array<{ severity: string }>): number {
  let score = 0;
  for (const factor of factors) {
    switch (factor.severity) {
      case 'high':
        score += 30;
        break;
      case 'medium':
        score += 15;
        break;
      case 'low':
        score += 5;
        break;
    }
  }
  return Math.min(100, score);
}
