/**
 * Copyright 2024-2026 gnanam
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  SANCTIONED_ADDRESSES,
  MIN_SANCTIONS_LIST_SIZE,
  hasRealSanctionsSource,
  isSanctioned,
  isOFACSanctioned,
  SANCTIONS_PROVENANCE,
  assertMainnetSafety,
} from './index.js';

// A real OFAC SDN EVM address from the generated dataset.
const KNOWN_SANCTIONED = '0x0330070fd38ec3bb94f58fa55d40368271e9e54a';

describe('sanctions list', () => {
  it('is a maintained list, not a stub (CI regression guard)', () => {
    expect(SANCTIONED_ADDRESSES.size).toBeGreaterThan(MIN_SANCTIONS_LIST_SIZE);
    expect(hasRealSanctionsSource()).toBe(true);
  });

  it('carries provenance metadata matching the loaded list', () => {
    expect(SANCTIONS_PROVENANCE.source).toContain('ofac');
    expect(SANCTIONS_PROVENANCE.count).toBe(SANCTIONED_ADDRESSES.size);
  });

  it('matches a known sanctioned address case-insensitively', () => {
    expect(isSanctioned(KNOWN_SANCTIONED)).toBe(true);
    expect(isSanctioned(KNOWN_SANCTIONED.toUpperCase().replace('0X', '0x'))).toBe(true);
    expect(isOFACSanctioned(KNOWN_SANCTIONED)).toBe(true);
  });

  it('does not flag a non-sanctioned address', () => {
    expect(isSanctioned('0x1111111111111111111111111111111111111111')).toBe(false);
  });
});

describe('mainnet honesty gate', () => {
  const baseOk = {
    isMainnet: true,
    feeEnabled: true,
    treasuryAddress: '0x1111111111111111111111111111111111111111',
    simulationFailOpen: false,
  };

  it('passes on mainnet with a real sanctions list loaded', () => {
    expect(assertMainnetSafety(baseOk).ok).toBe(true);
  });

  it('still enforces the other mainnet invariants', () => {
    const res = assertMainnetSafety({ ...baseOk, simulationFailOpen: true });
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => /fail-closed/.test(e))).toBe(true);
  });
});
