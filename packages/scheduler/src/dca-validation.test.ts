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

  describe('validateBalance', () => {
    test('returns ok (stub)', async () => {
      const result = await validateBalance('0x1234', '100');
      expect(result.ok).toBe(true);
    });
  });

  describe('validateAllowance', () => {
    test('returns ok (stub)', async () => {
      const result = await validateAllowance('0x1234', '0x5678', '100');
      expect(result.ok).toBe(true);
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
