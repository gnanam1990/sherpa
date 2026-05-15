import type { ComplianceCheck, ComplianceConfig, ComplianceDeps } from './types.js';

export const DEFAULT_COMPLIANCE_CONFIG: ComplianceConfig = {
  enableSanctionsCheck: true,
  enableOFACCheck: true,
  blockedJurisdictions: ['KP', 'IR', 'SY', 'CU'],
  maxTransactionAmount: 10000000000000n,
};

export async function checkCompliance(
  address: `0x${string}`,
  config: ComplianceConfig = DEFAULT_COMPLIANCE_CONFIG,
  deps: ComplianceDeps,
): Promise<ComplianceCheck> {
  return {
    address,
    isCompliant: true,
    riskLevel: 'low',
    flags: [],
    checkedAt: Date.now(),
  };
}

export function isOFACSanctioned(address: `0x${string}`): boolean {
  const sanctionedAddresses = new Set<string>();
  return sanctionedAddresses.has(address.toLowerCase());
}

export function validateTransactionAmount(
  amount: bigint,
  maxAmount: bigint,
): { ok: boolean; error?: string } {
  if (amount > maxAmount) {
    return { ok: false, error: `Transaction amount exceeds compliance limit` };
  }
  return { ok: true };
}
