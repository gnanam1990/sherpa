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

const VALID_OPTIONS = {
  sessionKeyAddress: '0x3333333333333333333333333333333333333333' as `0x${string}`,
  deploymentTx: '0x' + '12'.repeat(32) as `0x${string}`,
  now: 1_700_000_000,
};

describe('Session key factory', () => {
  test('records a caller-provided session key address with valid config', async () => {
    const result = await createSessionKey(VALID_CONFIG, VALID_OPTIONS);
    expect(result.sessionKeyAddress).toBe(VALID_OPTIONS.sessionKeyAddress);
    expect(result.deploymentTx).toBe(VALID_OPTIONS.deploymentTx);
    expect(result.validFrom).toBe(VALID_OPTIONS.now);
    expect(result.validUntil).toBe(VALID_OPTIONS.now + VALID_CONFIG.validDuration);
  });

  test('does not invent addresses for different calls', async () => {
    const r1 = await createSessionKey(VALID_CONFIG, {
      ...VALID_OPTIONS,
      sessionKeyAddress: '0x3333333333333333333333333333333333333333',
    });
    const r2 = await createSessionKey(VALID_CONFIG, {
      ...VALID_OPTIONS,
      sessionKeyAddress: '0x4444444444444444444444444444444444444444',
    });
    expect(r1.sessionKeyAddress).toBe('0x3333333333333333333333333333333333333333');
    expect(r2.sessionKeyAddress).toBe('0x4444444444444444444444444444444444444444');
  });

  test('validDuration maps to correct validUntil', async () => {
    const result = await createSessionKey(
      { ...VALID_CONFIG, validDuration: 3600 },
      VALID_OPTIONS,
    );
    expect(result.validUntil).toBe(VALID_OPTIONS.now + 3600);
  });

  test('returns deployment tx hash', async () => {
    const result = await createSessionKey(VALID_CONFIG, VALID_OPTIONS);
    expect(result.deploymentTx).toBe(VALID_OPTIONS.deploymentTx);
  });

  test('uses explicit zero hash when no deployment tx is provided', async () => {
    const result = await createSessionKey(VALID_CONFIG, {
      sessionKeyAddress: VALID_OPTIONS.sessionKeyAddress,
      now: VALID_OPTIONS.now,
    });
    expect(result.deploymentTx).toBe('0x' + '00'.repeat(32));
  });

  test('rejects zero address session keys', async () => {
    await expect(createSessionKey(VALID_CONFIG, {
      ...VALID_OPTIONS,
      sessionKeyAddress: '0x0000000000000000000000000000000000000000',
    })).rejects.toThrow('zero address');
  });

  test('rejects malformed session key addresses', async () => {
    await expect(createSessionKey(VALID_CONFIG, {
      ...VALID_OPTIONS,
      sessionKeyAddress: '0x1234',
    })).rejects.toThrow('valid EVM address');
  });

  test('rejects malformed deployment transaction hashes', async () => {
    await expect(createSessionKey(VALID_CONFIG, {
      ...VALID_OPTIONS,
      deploymentTx: '0x1234',
    })).rejects.toThrow('valid transaction hash');
  });

  test('rejects invalid configs instead of recording deployment metadata', async () => {
    await expect(createSessionKey(
      { ...VALID_CONFIG, spendLimit: 0n },
      VALID_OPTIONS,
    )).rejects.toThrow('Spend limit must be positive');
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
