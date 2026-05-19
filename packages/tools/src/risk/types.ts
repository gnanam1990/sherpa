/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

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
