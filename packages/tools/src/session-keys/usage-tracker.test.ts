import { describe, test, expect } from 'vitest';
import { checkUsageLimits, buildUsageSnapshot, type UsageLimits } from './usage-tracker.js';

describe('checkUsageLimits', () => {
  test('passes when no limits set', () => {
    const result = checkUsageLimits({}, buildUsageSnapshot('0', 0, '0', 0), '100');
    expect(result.ok).toBe(true);
  });

  test('passes when within perTxValue', () => {
    const limits: UsageLimits = { perTxValue: '1000' };
    const result = checkUsageLimits(limits, buildUsageSnapshot('0', 0, '0', 0), '500');
    expect(result.ok).toBe(true);
  });

  test('fails when exceeds perTxValue', () => {
    const limits: UsageLimits = { perTxValue: '100' };
    const result = checkUsageLimits(limits, buildUsageSnapshot('0', 0, '0', 0), '200');
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('Per-transaction limit');
  });

  test('passes when within dailyTotal', () => {
    const limits: UsageLimits = { dailyTotal: '1000' };
    const result = checkUsageLimits(limits, buildUsageSnapshot('500', 5, '500', 5), '400');
    expect(result.ok).toBe(true);
  });

  test('fails when exceeds dailyTotal', () => {
    const limits: UsageLimits = { dailyTotal: '1000' };
    const result = checkUsageLimits(limits, buildUsageSnapshot('5000', 50, '900', 9), '200');
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('Daily limit');
  });

  test('passes when within totalLimit', () => {
    const limits: UsageLimits = { totalLimit: '10000' };
    const result = checkUsageLimits(limits, buildUsageSnapshot('5000', 50, '500', 5), '4000');
    expect(result.ok).toBe(true);
  });

  test('fails when exceeds totalLimit', () => {
    const limits: UsageLimits = { totalLimit: '10000' };
    const result = checkUsageLimits(limits, buildUsageSnapshot('9500', 95, '500', 5), '600');
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('Total limit');
  });

  test('passes when within maxExecutionsPerDay', () => {
    const limits: UsageLimits = { maxExecutionsPerDay: 10 };
    const result = checkUsageLimits(limits, buildUsageSnapshot('0', 0, '0', 5), '100');
    expect(result.ok).toBe(true);
  });

  test('fails when maxExecutionsPerDay reached', () => {
    const limits: UsageLimits = { maxExecutionsPerDay: 10 };
    const result = checkUsageLimits(limits, buildUsageSnapshot('0', 0, '0', 10), '100');
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('Daily execution limit');
  });

  test('catches multiple limit violations', () => {
    const limits: UsageLimits = {
      perTxValue: '100',
      dailyTotal: '500',
      totalLimit: '1000',
    };
    const result = checkUsageLimits(
      limits,
      buildUsageSnapshot('950', 95, '450', 5),
      '200',
    );
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBe(3);
  });

  test('handles zero value transaction', () => {
    const limits: UsageLimits = { perTxValue: '100' };
    const result = checkUsageLimits(limits, buildUsageSnapshot('0', 0, '0', 0), '0');
    expect(result.ok).toBe(true);
  });

  test('handles exact boundary values', () => {
    const limits: UsageLimits = { perTxValue: '100' };
    const result = checkUsageLimits(limits, buildUsageSnapshot('0', 0, '0', 0), '100');
    expect(result.ok).toBe(true);
  });

  test('handles large values (BigInt)', () => {
    const limits: UsageLimits = { totalLimit: '1000000000000000000000' };
    const result = checkUsageLimits(
      limits,
      buildUsageSnapshot('500000000000000000000', 1, '0', 0),
      '400000000000000000000',
    );
    expect(result.ok).toBe(true);
  });
});

describe('buildUsageSnapshot', () => {
  test('constructs snapshot correctly', () => {
    const snap = buildUsageSnapshot('1000', 10, '500', 5);
    expect(snap.spentTotal).toBe('1000');
    expect(snap.executionCount).toBe(10);
    expect(snap.todaySpent).toBe('500');
    expect(snap.todayExecutions).toBe(5);
  });

  test('handles zero values', () => {
    const snap = buildUsageSnapshot('0', 0, '0', 0);
    expect(snap.spentTotal).toBe('0');
    expect(snap.executionCount).toBe(0);
  });
});
