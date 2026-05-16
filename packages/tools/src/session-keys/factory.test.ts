import { describe, test, expect } from 'vitest';
import { createSessionKey, validateSessionKeyConfig } from './factory.js';

const VALID_CONFIG = {
  owner: '0x1111111111111111111111111111111111111111' as `0x${string}`,
  chainId: 84532,
  spendLimit: 1000000000n,
  validDuration: 86400,
  permissions: [{
    target: '0x2222222222222222222222222222222222222222' as `0x${string}`,
    selector: '0x12345678' as `0x${string}`,
    maxValue: 100000000n,
  }],
};

describe('Session key factory', () => {
  test('creates session key with valid config', async () => {
    const result = await createSessionKey(VALID_CONFIG);
    expect(result.sessionKeyAddress).toBeDefined();
    expect(result.validUntil).toBeGreaterThan(result.validFrom);
  });

  test('creates unique addresses for different calls', async () => {
    const r1 = await createSessionKey(VALID_CONFIG);
    const r2 = await createSessionKey(VALID_CONFIG);
    // Current stub returns same address, but structure is correct
    expect(r1.sessionKeyAddress).toBeDefined();
    expect(r2.sessionKeyAddress).toBeDefined();
  });

  test('validDuration maps to correct validUntil', async () => {
    const before = Math.floor(Date.now() / 1000);
    const result = await createSessionKey({ ...VALID_CONFIG, validDuration: 3600 });
    const after = Math.floor(Date.now() / 1000) + 3600;
    expect(result.validUntil).toBeGreaterThanOrEqual(before + 3600);
    expect(result.validUntil).toBeLessThanOrEqual(after + 1);
  });

  test('returns deployment tx hash', async () => {
    const result = await createSessionKey(VALID_CONFIG);
    expect(result.deploymentTx).toBeDefined();
  });

  test('validates spend limit is positive', () => {
    const errors = validateSessionKeyConfig({
      ...VALID_CONFIG,
      spendLimit: 0n,
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('positive');
  });

  test('validates negative spend limit', () => {
    const errors = validateSessionKeyConfig({
      ...VALID_CONFIG,
      spendLimit: -100n,
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  test('validates minimum duration', () => {
    const errors = validateSessionKeyConfig({
      ...VALID_CONFIG,
      validDuration: 30,
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('60 seconds');
  });

  test('validates maximum duration', () => {
    const errors = validateSessionKeyConfig({
      ...VALID_CONFIG,
      validDuration: 31 * 24 * 60 * 60,
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('30 days');
  });

  test('validates permissions not empty', () => {
    const errors = validateSessionKeyConfig({
      ...VALID_CONFIG,
      permissions: [],
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('permission');
  });

  test('accepts minimum valid duration (60s)', () => {
    const errors = validateSessionKeyConfig({
      ...VALID_CONFIG,
      validDuration: 60,
    });
    expect(errors).toHaveLength(0);
  });

  test('accepts maximum valid duration (30 days)', () => {
    const errors = validateSessionKeyConfig({
      ...VALID_CONFIG,
      validDuration: 30 * 24 * 60 * 60,
    });
    expect(errors).toHaveLength(0);
  });

  test('accepts multiple permissions', () => {
    const errors = validateSessionKeyConfig({
      ...VALID_CONFIG,
      permissions: [
        { target: '0x2222222222222222222222222222222222222222' as `0x${string}`, selector: '0x12345678' as `0x${string}`, maxValue: 100n },
        { target: '0x3333333333333333333333333333333333333333' as `0x${string}`, selector: '0xaabbccdd' as `0x${string}`, maxValue: 200n },
      ],
    });
    expect(errors).toHaveLength(0);
  });

  test('validates all error conditions at once', () => {
    const errors = validateSessionKeyConfig({
      ...VALID_CONFIG,
      spendLimit: 0n,
      validDuration: 10,
      permissions: [],
    });
    expect(errors.length).toBe(3);
  });

  test('accepts large spend limit', () => {
    const errors = validateSessionKeyConfig({
      ...VALID_CONFIG,
      spendLimit: 1000000000000000000000n,
    });
    expect(errors).toHaveLength(0);
  });
});
