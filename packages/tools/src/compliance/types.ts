/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

export type ComplianceCheck = {
  address: `0x${string}`;
  isCompliant: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'prohibited';
  flags: ComplianceFlag[];
  checkedAt: number;
};

export type ComplianceFlag = {
  type: 'sanctions' | 'ofac' | 'pep' | 'adverse_media' | 'high_risk_jurisdiction';
  source: string;
  description: string;
  severity: 'warning' | 'block';
};

export type ComplianceConfig = {
  enableSanctionsCheck: boolean;
  enableOFACCheck: boolean;
  blockedJurisdictions: string[];
  maxTransactionAmount: bigint;
};

export type ComplianceDeps = {
  chainId: number;
};
