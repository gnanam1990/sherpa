/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { isSanctioned } from './sanctions.js';
import type { ComplianceCheck, ComplianceConfig, ComplianceDeps, ComplianceFlag } from './types.js';

export const DEFAULT_COMPLIANCE_CONFIG: ComplianceConfig = {
  enableSanctionsCheck: true,
  enableOFACCheck: true,
  blockedJurisdictions: [], // No jurisdiction rules — framework only
  maxTransactionAmount: 10000000000000n, // $10,000 in 6-decimal USDC
};

export async function checkCompliance(
  address: `0x${string}`,
  config: ComplianceConfig = DEFAULT_COMPLIANCE_CONFIG,
  _deps?: ComplianceDeps,
): Promise<ComplianceCheck> {
  const flags: ComplianceFlag[] = [];

  if (config.enableSanctionsCheck && isSanctioned(address)) {
    flags.push({
      type: 'sanctions',
      source: 'internal_list',
      description: 'Address is on the internal sanctions list',
      severity: 'block',
    });
  }

  const isCompliant = flags.filter((f) => f.severity === 'block').length === 0;
  const riskLevel = flags.length === 0
    ? 'low'
    : flags.some((f) => f.severity === 'block')
      ? 'prohibited'
      : 'medium';

  return {
    address,
    isCompliant,
    riskLevel,
    flags,
    checkedAt: Date.now(),
  };
}

export function isOFACSanctioned(address: `0x${string}`): boolean {
  return isSanctioned(address);
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
