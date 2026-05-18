import { describe, test, expect } from 'vitest';
import { checkCompliance, isOFACSanctioned, validateTransactionAmount } from './checker.js';
import { isSanctioned } from './sanctions.js';

const NORMAL_ADDRESS = '0x1234567890123456789012345678901234567890' as `0x${string}`;
const SANCTIONED_ADDRESS = '0x8576acc5c05d6ce88f4e49bf65bdf0c62f91353c' as `0x${string}`;

describe('Compliance checker', () => {
  test('checkCompliance returns compliant for normal address', async () => {
    const result = await checkCompliance(NORMAL_ADDRESS);
    expect(result.isCompliant).toBe(true);
    expect(result.riskLevel).toBe('low');
    expect(result.flags.length).toBe(0);
  });

  test('checkCompliance flags sanctioned address', async () => {
    const result = await checkCompliance(SANCTIONED_ADDRESS);
    expect(result.isCompliant).toBe(false);
    expect(result.riskLevel).toBe('prohibited');
    expect(result.flags.length).toBe(1);
    expect(result.flags[0].type).toBe('sanctions');
    expect(result.flags[0].severity).toBe('block');
  });

  test('checkCompliance respects enableSanctionsCheck flag', async () => {
    const result = await checkCompliance(SANCTIONED_ADDRESS, {
      enableSanctionsCheck: false,
      enableOFACCheck: true,
      blockedJurisdictions: [],
      maxTransactionAmount: 10000000000000n,
    });
    expect(result.isCompliant).toBe(true);
    expect(result.flags.length).toBe(0);
  });

  test('isOFACSanctioned returns false for normal address', () => {
    expect(isOFACSanctioned(NORMAL_ADDRESS)).toBe(false);
  });

  test('isOFACSanctioned returns true for sanctioned address', () => {
    expect(isOFACSanctioned(SANCTIONED_ADDRESS)).toBe(true);
  });

  test('isSanctioned checks the sanctions list', () => {
    expect(isSanctioned(SANCTIONED_ADDRESS)).toBe(true);
    expect(isSanctioned(NORMAL_ADDRESS)).toBe(false);
  });

  test('validateTransactionAmount accepts valid amount', () => {
    expect(validateTransactionAmount(1000000000n, 10000000000n).ok).toBe(true);
  });

  test('validateTransactionAmount rejects excessive amount', () => {
    expect(validateTransactionAmount(100000000000n, 10000000000n).ok).toBe(false);
  });

  test('validateTransactionAmount accepts exact limit', () => {
    expect(validateTransactionAmount(10000000000n, 10000000000n).ok).toBe(true);
  });
});
