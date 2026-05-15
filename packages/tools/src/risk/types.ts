export type PortfolioRisk = {
  address: `0x${string}`;
  overallRisk: 'low' | 'medium' | 'high' | 'extreme';
  riskScore: number;
  factors: RiskFactor[];
  recommendations: string[];
};

export type RiskFactor = {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  impact: string;
  mitigation?: string;
};

export type ExposureBreakdown = {
  byChain: Record<string, { value: bigint; percent: number }>;
  byProtocol: Record<string, { value: bigint; percent: number }>;
  byAsset: Record<string, { value: bigint; percent: number }>;
  maxSingleExposure: { name: string; value: bigint; percent: number };
};

export type RiskDeps = {
  chainId: number;
};
