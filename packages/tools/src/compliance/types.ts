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
