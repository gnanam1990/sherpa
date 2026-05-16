import { describe, test, expect } from 'vitest';
import {
  validateTransaction,
  validatePermissionScope,
  type PermissionGrant,
} from './permission-validator.js';

const ZERO_ADDR = '0x0000000000000000000000000000000000000001' as `0x${string}`;
const OTHER_ADDR = '0x0000000000000000000000000000000000000002' as `0x${string}`;
const SELECTOR = '0x12345678' as `0x${string}`;
const BAD_SELECTOR = '0xdeadbeef' as `0x${string}`;

function grant(overrides: Partial<PermissionGrant> = {}): PermissionGrant {
  return {
    permissions: [{ target: ZERO_ADDR, selector: SELECTOR, maxValue: 1000n }],
    spendLimit: 10000n,
    spentAmount: 0n,
    validUntil: Math.floor(Date.now() / 1000) + 86400,
    maxExecutions: 100,
    executionCount: 0,
    status: 'active',
    ...overrides,
  };
}

describe('validateTransaction', () => {
  test('accepts valid transaction within limits', () => {
    const result = validateTransaction(grant(), ZERO_ADDR, SELECTOR, 500n);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('rejects when status is revoked', () => {
    const result = validateTransaction(grant({ status: 'revoked' }), ZERO_ADDR, SELECTOR, 100n);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('revoked');
  });

  test('rejects when status is expired', () => {
    const result = validateTransaction(grant({ status: 'expired' }), ZERO_ADDR, SELECTOR, 100n);
    expect(result.ok).toBe(false);
  });

  test('rejects when status is exhausted', () => {
    const result = validateTransaction(grant({ status: 'exhausted' }), ZERO_ADDR, SELECTOR, 100n);
    expect(result.ok).toBe(false);
  });

  test('rejects expired key (validUntil in the past)', () => {
    const past = Math.floor(Date.now() / 1000) - 100;
    const result = validateTransaction(
      grant({ validUntil: past }),
      ZERO_ADDR,
      SELECTOR,
      100n,
    );
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('expired');
  });

  test('rejects when execution limit reached', () => {
    const result = validateTransaction(
      grant({ executionCount: 100, maxExecutions: 100 }),
      ZERO_ADDR,
      SELECTOR,
      100n,
    );
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('Execution limit');
  });

  test('rejects when total spend would exceed limit', () => {
    const result = validateTransaction(
      grant({ spentAmount: 9600n, spendLimit: 10000n }),
      ZERO_ADDR,
      SELECTOR,
      500n,
    );
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('Spend limit exceeded');
  });

  test('rejects when target is not in whitelist', () => {
    const result = validateTransaction(grant(), OTHER_ADDR, SELECTOR, 100n);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('not in permission whitelist');
  });

  test('rejects when selector is not permitted', () => {
    const result = validateTransaction(grant(), ZERO_ADDR, BAD_SELECTOR, 100n);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('not permitted');
  });

  test('rejects when value exceeds per-call maxValue', () => {
    const result = validateTransaction(grant(), ZERO_ADDR, SELECTOR, 2000n);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('exceeds per-call limit');
  });

  test('accepts value exactly at maxValue', () => {
    const result = validateTransaction(grant(), ZERO_ADDR, SELECTOR, 1000n);
    expect(result.ok).toBe(true);
  });

  test('accepts value at spendLimit boundary', () => {
    const result = validateTransaction(
      grant({ spentAmount: 9000n, spendLimit: 10000n }),
      ZERO_ADDR,
      SELECTOR,
      1000n,
    );
    expect(result.ok).toBe(true);
  });

  test('rejects multiple errors at once', () => {
    const result = validateTransaction(
      grant({ status: 'revoked', spentAmount: 9999n }),
      OTHER_ADDR,
      BAD_SELECTOR,
      5000n,
    );
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
  });

  test('works with custom now parameter for time travel', () => {
    const futureNow = Math.floor(Date.now() / 1000) + 86400 * 2;
    const result = validateTransaction(
      grant(),
      ZERO_ADDR,
      SELECTOR,
      100n,
      futureNow,
    );
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('expired');
  });

  test('accepts zero value transaction', () => {
    const result = validateTransaction(grant(), ZERO_ADDR, SELECTOR, 0n);
    expect(result.ok).toBe(true);
  });

  test('handles multiple permissions for same target', () => {
    const g = grant({
      permissions: [
        { target: ZERO_ADDR, selector: SELECTOR, maxValue: 500n },
        { target: ZERO_ADDR, selector: '0xaabbccdd' as `0x${string}`, maxValue: 2000n },
      ],
    });
    const result = validateTransaction(g, ZERO_ADDR, SELECTOR, 400n);
    expect(result.ok).toBe(true);
  });

  test('selects highest maxValue among matching permissions', () => {
    const g = grant({
      permissions: [
        { target: ZERO_ADDR, selector: SELECTOR, maxValue: 100n },
        { target: ZERO_ADDR, selector: SELECTOR, maxValue: 2000n },
      ],
    });
    const result = validateTransaction(g, ZERO_ADDR, SELECTOR, 1500n);
    expect(result.ok).toBe(true);
  });

  test('case-insensitive target comparison', () => {
    const upper = '0x0000000000000000000000000000000000000001'.toUpperCase() as `0x${string}`;
    const result = validateTransaction(grant(), upper, SELECTOR, 100n);
    expect(result.ok).toBe(true);
  });

  test('at exactly validUntil is rejected (not before)', () => {
    const exact = Math.floor(Date.now() / 1000);
    const result = validateTransaction(
      grant({ validUntil: exact }),
      ZERO_ADDR,
      SELECTOR,
      100n,
      exact,
    );
    expect(result.ok).toBe(false);
  });

  test('one second before validUntil is accepted', () => {
    const exact = Math.floor(Date.now() / 1000);
    const result = validateTransaction(
      grant({ validUntil: exact }),
      ZERO_ADDR,
      SELECTOR,
      100n,
      exact - 1,
    );
    expect(result.ok).toBe(true);
  });
});

describe('validatePermissionScope', () => {
  test('accepts valid permissions', () => {
    const result = validatePermissionScope([
      { target: ZERO_ADDR, selector: SELECTOR, maxValue: 100n },
    ]);
    expect(result.ok).toBe(true);
  });

  test('rejects empty permissions', () => {
    const result = validatePermissionScope([]);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('At least one');
  });

  test('rejects invalid target address', () => {
    const result = validatePermissionScope([
      { target: 'not-an-address' as `0x${string}`, selector: SELECTOR, maxValue: 100n },
    ]);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('Invalid target');
  });

  test('rejects invalid selector format', () => {
    const result = validatePermissionScope([
      { target: ZERO_ADDR, selector: '0x1234' as `0x${string}`, maxValue: 100n },
    ]);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('Invalid selector');
  });

  test('rejects negative maxValue', () => {
    const result = validatePermissionScope([
      { target: ZERO_ADDR, selector: SELECTOR, maxValue: -1n },
    ]);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('non-negative');
  });

  test('accepts zero maxValue', () => {
    const result = validatePermissionScope([
      { target: ZERO_ADDR, selector: SELECTOR, maxValue: 0n },
    ]);
    expect(result.ok).toBe(true);
  });

  test('validates multiple permissions', () => {
    const result = validatePermissionScope([
      { target: ZERO_ADDR, selector: SELECTOR, maxValue: 100n },
      { target: 'bad' as `0x${string}`, selector: '0xbad' as `0x${string}`, maxValue: 100n },
    ]);
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
  });
});
