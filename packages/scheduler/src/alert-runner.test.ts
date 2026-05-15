import { describe, test, expect } from 'vitest';
import { checkCondition } from './alert-runner.js';

describe('Alert runner', () => {
  test('checkCondition > returns true when above', () => {
    expect(checkCondition(5001, '>', 5000)).toBe(true);
    expect(checkCondition(4999, '>', 5000)).toBe(false);
  });

  test('checkCondition < returns true when below', () => {
    expect(checkCondition(4999, '<', 5000)).toBe(true);
    expect(checkCondition(5001, '<', 5000)).toBe(false);
  });

  test('checkCondition >= includes boundary', () => {
    expect(checkCondition(5000, '>=', 5000)).toBe(true);
    expect(checkCondition(4999, '>=', 5000)).toBe(false);
  });

  test('checkCondition <= includes boundary', () => {
    expect(checkCondition(5000, '<=', 5000)).toBe(true);
    expect(checkCondition(5001, '<=', 5000)).toBe(false);
  });

  test('checkCondition == matches exactly', () => {
    expect(checkCondition(5000, '==', 5000)).toBe(true);
    expect(checkCondition(5001, '==', 5000)).toBe(false);
  });

  test('checkCondition unknown operator returns false', () => {
    expect(checkCondition(5000, '!=', 5000)).toBe(false);
  });
});
