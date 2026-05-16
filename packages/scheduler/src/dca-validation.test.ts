import { describe, test, expect } from 'vitest';
import {
  validateDCASchedule,
  validateBalance,
  validateAllowance,
  VALID_FREQUENCIES,
  VALID_END_CONDITIONS,
} from './dca-validation.js';

describe('DCA validation', () => {
  describe('validateDCASchedule', () => {
    describe('frequency', () => {
      test('accepts daily', () => {
        expect(validateDCASchedule({ frequency: 'daily', amountPerTick: '100' }).ok).toBe(true);
      });

      test('accepts weekly', () => {
        expect(validateDCASchedule({ frequency: 'weekly', amountPerTick: '100' }).ok).toBe(true);
      });

      test('accepts biweekly', () => {
        expect(validateDCASchedule({ frequency: 'biweekly', amountPerTick: '100' }).ok).toBe(true);
      });

      test('accepts monthly', () => {
        expect(validateDCASchedule({ frequency: 'monthly', amountPerTick: '100' }).ok).toBe(true);
      });

      test('rejects invalid frequency', () => {
        const result = validateDCASchedule({ frequency: 'hourly', amountPerTick: '100' });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toContain('Invalid frequency');
      });
    });

    describe('amountPerTick', () => {
      test('accepts positive number', () => {
        expect(validateDCASchedule({ frequency: 'daily', amountPerTick: '50' }).ok).toBe(true);
      });

      test('accepts decimal amount', () => {
        expect(validateDCASchedule({ frequency: 'daily', amountPerTick: '0.5' }).ok).toBe(true);
      });

      test('rejects zero', () => {
        const result = validateDCASchedule({ frequency: 'daily', amountPerTick: '0' });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toContain('positive');
      });

      test('rejects negative', () => {
        const result = validateDCASchedule({ frequency: 'daily', amountPerTick: '-10' });
        expect(result.ok).toBe(false);
      });

      test('rejects empty string', () => {
        const result = validateDCASchedule({ frequency: 'daily', amountPerTick: '' });
        expect(result.ok).toBe(false);
      });

      test('rejects non-numeric', () => {
        const result = validateDCASchedule({ frequency: 'daily', amountPerTick: 'abc' });
        expect(result.ok).toBe(false);
      });

      test('rejects amount over 1,000,000', () => {
        const result = validateDCASchedule({ frequency: 'daily', amountPerTick: '1000001' });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toContain('maximum');
      });

      test('accepts exactly 1,000,000', () => {
        expect(validateDCASchedule({ frequency: 'daily', amountPerTick: '1000000' }).ok).toBe(true);
      });
    });

    describe('endCondition', () => {
      test('defaults to never', () => {
        expect(validateDCASchedule({ frequency: 'daily', amountPerTick: '100' }).ok).toBe(true);
      });

      test('accepts never', () => {
        expect(validateDCASchedule({ frequency: 'daily', amountPerTick: '100', endCondition: 'never' }).ok).toBe(true);
      });

      test('accepts count with maxExecutions', () => {
        expect(validateDCASchedule({ frequency: 'daily', amountPerTick: '100', endCondition: 'count', maxExecutions: 10 }).ok).toBe(true);
      });

      test('rejects count without maxExecutions', () => {
        const result = validateDCASchedule({ frequency: 'daily', amountPerTick: '100', endCondition: 'count' });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toContain('maxExecutions');
      });

      test('rejects count with zero maxExecutions', () => {
        const result = validateDCASchedule({ frequency: 'daily', amountPerTick: '100', endCondition: 'count', maxExecutions: 0 });
        expect(result.ok).toBe(false);
      });

      test('rejects count with maxExecutions > 10000', () => {
        const result = validateDCASchedule({ frequency: 'daily', amountPerTick: '100', endCondition: 'count', maxExecutions: 10001 });
        expect(result.ok).toBe(false);
      });

      test('accepts date with valid future endDate', () => {
        const futureDate = new Date(Date.now() + 86400000).toISOString();
        expect(validateDCASchedule({ frequency: 'daily', amountPerTick: '100', endCondition: 'date', endDate: futureDate }).ok).toBe(true);
      });

      test('rejects date without endDate', () => {
        const result = validateDCASchedule({ frequency: 'daily', amountPerTick: '100', endCondition: 'date' });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toContain('endDate');
      });

      test('rejects date with past endDate', () => {
        const pastDate = new Date(Date.now() - 86400000).toISOString();
        const result = validateDCASchedule({ frequency: 'daily', amountPerTick: '100', endCondition: 'date', endDate: pastDate });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toContain('future');
      });

      test('rejects invalid endCondition', () => {
        const result = validateDCASchedule({ frequency: 'daily', amountPerTick: '100', endCondition: 'invalid' });
        expect(result.ok).toBe(false);
      });
    });

    describe('dayOfWeek', () => {
      test('accepts valid dayOfWeek for weekly', () => {
        expect(validateDCASchedule({ frequency: 'weekly', amountPerTick: '100', dayOfWeek: 3 }).ok).toBe(true);
      });

      test('rejects dayOfWeek > 6', () => {
        const result = validateDCASchedule({ frequency: 'weekly', amountPerTick: '100', dayOfWeek: 7 });
        expect(result.ok).toBe(false);
      });

      test('rejects dayOfWeek < 0', () => {
        const result = validateDCASchedule({ frequency: 'weekly', amountPerTick: '100', dayOfWeek: -1 });
        expect(result.ok).toBe(false);
      });
    });

    describe('dayOfMonth', () => {
      test('accepts valid dayOfMonth for monthly', () => {
        expect(validateDCASchedule({ frequency: 'monthly', amountPerTick: '100', dayOfMonth: 15 }).ok).toBe(true);
      });

      test('rejects dayOfMonth > 31', () => {
        const result = validateDCASchedule({ frequency: 'monthly', amountPerTick: '100', dayOfMonth: 32 });
        expect(result.ok).toBe(false);
      });

      test('rejects dayOfMonth < 1', () => {
        const result = validateDCASchedule({ frequency: 'monthly', amountPerTick: '100', dayOfMonth: 0 });
        expect(result.ok).toBe(false);
      });
    });

    describe('hourOfDay', () => {
      test('accepts valid hour', () => {
        expect(validateDCASchedule({ frequency: 'daily', amountPerTick: '100', hourOfDay: 12 }).ok).toBe(true);
      });

      test('rejects hour > 23', () => {
        const result = validateDCASchedule({ frequency: 'daily', amountPerTick: '100', hourOfDay: 24 });
        expect(result.ok).toBe(false);
      });

      test('rejects hour < 0', () => {
        const result = validateDCASchedule({ frequency: 'daily', amountPerTick: '100', hourOfDay: -1 });
        expect(result.ok).toBe(false);
      });
    });
  });

  describe('validateBalance (P1-9)', () => {
    const params = {
      userAddress: '0x1111111111111111111111111111111111111111',
      token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      amount: 100n * 10n ** 6n,
      rpcUrl: 'https://rpc.example.com',
    };

    test('returns ok when balance >= amount', async () => {
      const mockFetch = async () => 200n * 10n ** 6n;
      const result = await validateBalance(params, mockFetch);
      expect(result.ok).toBe(true);
    });

    test('returns ok when balance equals amount exactly', async () => {
      const mockFetch = async () => params.amount;
      const result = await validateBalance(params, mockFetch);
      expect(result.ok).toBe(true);
    });

    test('returns insufficient_balance when balance < amount', async () => {
      const mockFetch = async () => 50n * 10n ** 6n;
      const result = await validateBalance(params, mockFetch);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe('insufficient_balance');
    });

    test('returns insufficient_balance when balance is zero', async () => {
      const mockFetch = async () => 0n;
      const result = await validateBalance(params, mockFetch);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe('insufficient_balance');
    });

    test('propagates RPC errors — does not swallow', async () => {
      const mockFetch = async () => { throw new Error('rpc_http_429'); };
      await expect(validateBalance(params, mockFetch)).rejects.toThrow('rpc_http_429');
    });
  });

  describe('validateAllowance (P1-9)', () => {
    const params = {
      userAddress: '0x1111111111111111111111111111111111111111',
      token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      spender: '0x2222222222222222222222222222222222222222',
      amount: 100n * 10n ** 6n,
      rpcUrl: 'https://rpc.example.com',
    };

    test('returns ok when allowance >= amount', async () => {
      const mockFetch = async () => 200n * 10n ** 6n;
      const result = await validateAllowance(params, mockFetch);
      expect(result.ok).toBe(true);
    });

    test('returns ok when allowance equals amount exactly', async () => {
      const mockFetch = async () => params.amount;
      const result = await validateAllowance(params, mockFetch);
      expect(result.ok).toBe(true);
    });

    test('returns insufficient_allowance when allowance < amount', async () => {
      const mockFetch = async () => 0n;
      const result = await validateAllowance(params, mockFetch);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe('insufficient_allowance');
    });

    test('propagates RPC errors — does not swallow', async () => {
      const mockFetch = async () => { throw new Error('rpc_error: execution reverted'); };
      await expect(validateAllowance(params, mockFetch)).rejects.toThrow('rpc_error');
    });
  });

  describe('constants', () => {
    test('VALID_FREQUENCIES includes all options', () => {
      expect(VALID_FREQUENCIES).toEqual(['daily', 'weekly', 'biweekly', 'monthly']);
    });

    test('VALID_END_CONDITIONS includes all options', () => {
      expect(VALID_END_CONDITIONS).toEqual(['never', 'count', 'date']);
    });
  });
});
