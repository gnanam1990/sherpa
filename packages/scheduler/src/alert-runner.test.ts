import { describe, test, expect } from 'vitest';
import { checkCondition, isInCooldown, shouldEvaluate, type AlertRow } from './alert-runner.js';

describe('Alert runner', () => {
  describe('checkCondition', () => {
    test('> returns true when above', () => {
      expect(checkCondition(5001, '>', 5000)).toBe(true);
      expect(checkCondition(4999, '>', 5000)).toBe(false);
      expect(checkCondition(5000, '>', 5000)).toBe(false);
    });

    test('< returns true when below', () => {
      expect(checkCondition(4999, '<', 5000)).toBe(true);
      expect(checkCondition(5001, '<', 5000)).toBe(false);
      expect(checkCondition(5000, '<', 5000)).toBe(false);
    });

    test('>= includes boundary', () => {
      expect(checkCondition(5000, '>=', 5000)).toBe(true);
      expect(checkCondition(4999, '>=', 5000)).toBe(false);
      expect(checkCondition(5001, '>=', 5000)).toBe(true);
    });

    test('<= includes boundary', () => {
      expect(checkCondition(5000, '<=', 5000)).toBe(true);
      expect(checkCondition(5001, '<=', 5000)).toBe(false);
      expect(checkCondition(4999, '<=', 5000)).toBe(true);
    });

    test('== matches exactly', () => {
      expect(checkCondition(5000, '==', 5000)).toBe(true);
      expect(checkCondition(5001, '==', 5000)).toBe(false);
    });

    test('cross-above triggers on upward crossing', () => {
      expect(checkCondition(5001, 'cross-above', 5000, 4999)).toBe(true);
      expect(checkCondition(5001, 'cross-above', 5000, 5001)).toBe(false);
      expect(checkCondition(4999, 'cross-above', 5000, 4998)).toBe(false);
    });

    test('cross-above without previous value uses current comparison', () => {
      expect(checkCondition(5001, 'cross-above', 5000)).toBe(true);
      expect(checkCondition(4999, 'cross-above', 5000)).toBe(false);
    });

    test('cross-below triggers on downward crossing', () => {
      expect(checkCondition(4999, 'cross-below', 5000, 5001)).toBe(true);
      expect(checkCondition(4999, 'cross-below', 5000, 4999)).toBe(false);
      expect(checkCondition(5001, 'cross-below', 5000, 5002)).toBe(false);
    });

    test('cross-below without previous value uses current comparison', () => {
      expect(checkCondition(4999, 'cross-below', 5000)).toBe(true);
      expect(checkCondition(5001, 'cross-below', 5000)).toBe(false);
    });

    test('unknown operator returns false', () => {
      expect(checkCondition(5000, '!=', 5000)).toBe(false);
      expect(checkCondition(5000, 'like', 5000)).toBe(false);
    });

    test('handles zero threshold', () => {
      expect(checkCondition(0, '==', 0)).toBe(true);
      expect(checkCondition(1, '>', 0)).toBe(true);
    });

    test('handles negative values', () => {
      expect(checkCondition(-5, '<', 0)).toBe(true);
      expect(checkCondition(-5, '>', 0)).toBe(false);
    });

    test('handles decimal values', () => {
      expect(checkCondition(1.5, '>', 1.4)).toBe(true);
      expect(checkCondition(1.5, '<', 1.6)).toBe(true);
      expect(checkCondition(1.5, '==', 1.5)).toBe(true);
    });
  });

  describe('isInCooldown', () => {
    test('returns false when never triggered', () => {
      const alert: Partial<AlertRow> = { last_triggered_at: undefined };
      expect(isInCooldown(alert as AlertRow)).toBe(false);
    });

    test('returns true when within cooldown', () => {
      const alert: Partial<AlertRow> = {
        last_triggered_at: new Date().toISOString(),
        cooldown_seconds: 3600,
      };
      expect(isInCooldown(alert as AlertRow)).toBe(true);
    });

    test('returns false when cooldown expired', () => {
      const alert: Partial<AlertRow> = {
        last_triggered_at: new Date(Date.now() - 7200000).toISOString(),
        cooldown_seconds: 3600,
      };
      expect(isInCooldown(alert as AlertRow)).toBe(false);
    });

    test('uses default cooldown of 3600s', () => {
      const alert: Partial<AlertRow> = {
        last_triggered_at: new Date(Date.now() - 1800000).toISOString(),
        cooldown_seconds: undefined,
      };
      expect(isInCooldown(alert as AlertRow)).toBe(true);
    });
  });

  describe('shouldEvaluate', () => {
    test('returns true for active alerts', () => {
      const alert: Partial<AlertRow> = { status: 'active' };
      expect(shouldEvaluate(alert as AlertRow)).toBe(true);
    });

    test('returns false for paused alerts', () => {
      const alert: Partial<AlertRow> = { status: 'paused' };
      expect(shouldEvaluate(alert as AlertRow)).toBe(false);
    });

    test('returns false for completed alerts', () => {
      const alert: Partial<AlertRow> = { status: 'completed' };
      expect(shouldEvaluate(alert as AlertRow)).toBe(false);
    });

    test('returns false for triggered alerts', () => {
      const alert: Partial<AlertRow> = { status: 'triggered' };
      expect(shouldEvaluate(alert as AlertRow)).toBe(false);
    });
  });
});
