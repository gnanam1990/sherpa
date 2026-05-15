import { describe, test, expect } from 'vitest';
import { checkCompliance, isOFACSanctioned, validateTransactionAmount } from './checker.js';

describe('Compliance checker', () => {
  test('checkCompliance returns compliant by default', async () => {
    const result = await checkCompliance('0x1234', undefined, { chainId: 8453 });
    expect(result.isCompliant).toBe(true);
  });

  test('isOFACSanctioned returns false for normal address', () => {
    expect(isOFACSanctioned('0x1234')).toBe(false);
  });

  test('validateTransactionAmount accepts valid amount', () => {
    expect(validateTransactionAmount(1000000000n, 10000000000n).ok).toBe(true);
  });

  test('validateTransactionAmount rejects excessive amount', () => {
    expect(validateTransactionAmount(100000000000n, 10000000000n).ok).toBe(false);
  });
});
