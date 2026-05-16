import { describe, test, expect } from 'vitest';
import {
  delegate,
  getDelegation,
  revokeDelegation,
  delegateToAll,
  revokeAll,
  type Protocol,
} from './delegation.js';

describe('Delegation', () => {
  const userAddress = '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`;
  const delegatee = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`;

  describe('delegate', () => {
    test('delegates to aave', () => {
      const result = delegate(userAddress, delegatee, 'aave');
      expect(result.protocol).toBe('aave');
      expect(result.delegator).toBe(userAddress);
      expect(result.delegatee).toBe(delegatee);
      expect(result.to).toBeDefined();
      expect(result.value).toBe(0n);
    });

    test('delegates to compound', () => {
      const result = delegate(userAddress, delegatee, 'compound');
      expect(result.protocol).toBe('compound');
      expect(result.delegator).toBe(userAddress);
      expect(result.delegatee).toBe(delegatee);
    });

    test('delegates to optimism', () => {
      const result = delegate(userAddress, delegatee, 'optimism');
      expect(result.protocol).toBe('optimism');
      expect(result.delegator).toBe(userAddress);
      expect(result.delegatee).toBe(delegatee);
    });

    test('throws on unsupported protocol', () => {
      expect(() => delegate(userAddress, delegatee, 'uniswap' as Protocol)).toThrow();
    });

    test('returns tx data', () => {
      const result = delegate(userAddress, delegatee, 'aave');
      expect(result.data).toBeDefined();
      expect(typeof result.data).toBe('string');
    });
  });

  describe('getDelegation', () => {
    test('returns delegation status for aave', async () => {
      const status = await getDelegation(userAddress, 'aave');
      expect(status.protocol).toBe('aave');
      expect(status.active).toBe(false);
    });

    test('returns delegation status for compound', async () => {
      const status = await getDelegation(userAddress, 'compound');
      expect(status.protocol).toBe('compound');
    });

    test('returns delegation status for optimism', async () => {
      const status = await getDelegation(userAddress, 'optimism');
      expect(status.protocol).toBe('optimism');
    });
  });

  describe('revokeDelegation', () => {
    test('revokes by self-delegating', () => {
      const result = revokeDelegation(userAddress, 'aave');
      expect(result.delegatee).toBe(userAddress);
      expect(result.protocol).toBe('aave');
    });

    test('revokes compound delegation', () => {
      const result = revokeDelegation(userAddress, 'compound');
      expect(result.delegatee).toBe(userAddress);
      expect(result.protocol).toBe('compound');
    });

    test('revokes optimism delegation', () => {
      const result = revokeDelegation(userAddress, 'optimism');
      expect(result.delegatee).toBe(userAddress);
      expect(result.protocol).toBe('optimism');
    });
  });

  describe('delegateToAll', () => {
    test('delegates to all protocols', () => {
      const results = delegateToAll(userAddress, delegatee);
      expect(results).toHaveLength(3);
      expect(results.map((r) => r.protocol)).toEqual(['aave', 'compound', 'optimism']);
    });

    test('all results have same delegatee', () => {
      const results = delegateToAll(userAddress, delegatee);
      results.forEach((r) => expect(r.delegatee).toBe(delegatee));
    });
  });

  describe('revokeAll', () => {
    test('revokes all protocols', () => {
      const results = revokeAll(userAddress);
      expect(results).toHaveLength(3);
      results.forEach((r) => expect(r.delegatee).toBe(userAddress));
    });
  });
});
