import { describe, test, expect } from 'vitest';
import { createSessionKey, validateSessionKeyConfig } from './factory.js';

describe('Session key factory', () => {
  test('creates session key with valid config', async () => {
    const result = await createSessionKey({
      owner: '0x1111111111111111111111111111111111111111',
      chainId: 84532,
      spendLimit: 1000000000n,
      validDuration: 86400,
      permissions: [{
        target: '0x2222222222222222222222222222222222222222',
        selector: '0x12345678',
        maxValue: 100000000n,
      }],
    });
    expect(result.sessionKeyAddress).toBeDefined();
    expect(result.validUntil).toBeGreaterThan(result.validFrom);
  });

  test('validates spend limit is positive', () => {
    const errors = validateSessionKeyConfig({
      owner: '0x1111',
      chainId: 84532,
      spendLimit: 0n,
      validDuration: 86400,
      permissions: [{ target: '0x2222', selector: '0x12345678', maxValue: 100n }],
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  test('validates minimum duration', () => {
    const errors = validateSessionKeyConfig({
      owner: '0x1111',
      chainId: 84532,
      spendLimit: 1000n,
      validDuration: 30, // too short
      permissions: [{ target: '0x2222', selector: '0x12345678', maxValue: 100n }],
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  test('validates permissions not empty', () => {
    const errors = validateSessionKeyConfig({
      owner: '0x1111',
      chainId: 84532,
      spendLimit: 1000n,
      validDuration: 86400,
      permissions: [],
    });
    expect(errors.length).toBeGreaterThan(0);
  });
});
