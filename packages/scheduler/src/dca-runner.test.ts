import { describe, test, expect } from 'vitest';
import { calculateNextExecution } from './dca-runner.js';

describe('DCA runner', () => {
  test('calculateNextExecution daily', () => {
    const next = calculateNextExecution('daily');
    expect(next).toBeInstanceOf(Date);
    expect(next.getTime()).toBeGreaterThan(Date.now());
  });

  test('calculateNextExecution weekly', () => {
    const next = calculateNextExecution('weekly', 1); // Monday
    expect(next.getUTCDay()).toBe(1);
  });

  test('calculateNextExecution monthly', () => {
    const next = calculateNextExecution('monthly', undefined, 15);
    expect(next.getUTCDate()).toBe(15);
  });
});
