import { describe, test, expect } from 'vitest';
import { checkCondition } from './check-condition.js';

describe('checkCondition', () => {
  test('> returns true when above threshold', () => {
    expect(checkCondition(100, '>', 50)).toBe(true);
    expect(checkCondition(50, '>', 50)).toBe(false);
    expect(checkCondition(49, '>', 50)).toBe(false);
  });

  test('< returns true when below threshold', () => {
    expect(checkCondition(49, '<', 50)).toBe(true);
    expect(checkCondition(50, '<', 50)).toBe(false);
    expect(checkCondition(51, '<', 50)).toBe(false);
  });

  test('>= includes boundary', () => {
    expect(checkCondition(50, '>=', 50)).toBe(true);
    expect(checkCondition(51, '>=', 50)).toBe(true);
    expect(checkCondition(49, '>=', 50)).toBe(false);
  });

  test('<= includes boundary', () => {
    expect(checkCondition(50, '<=', 50)).toBe(true);
    expect(checkCondition(49, '<=', 50)).toBe(true);
    expect(checkCondition(51, '<=', 50)).toBe(false);
  });

  test('== matches exactly', () => {
    expect(checkCondition(50, '==', 50)).toBe(true);
    expect(checkCondition(51, '==', 50)).toBe(false);
    expect(checkCondition(49, '==', 50)).toBe(false);
  });

  test('cross-above detects upward crossing', () => {
    expect(checkCondition(51, 'cross-above', 50, 49)).toBe(true);
    expect(checkCondition(51, 'cross-above', 50, 51)).toBe(false);
    expect(checkCondition(49, 'cross-above', 50, 48)).toBe(false);
  });

  test('cross-above without previous falls back to >', () => {
    expect(checkCondition(51, 'cross-above', 50)).toBe(true);
    expect(checkCondition(49, 'cross-above', 50)).toBe(false);
  });

  test('cross-below detects downward crossing', () => {
    expect(checkCondition(49, 'cross-below', 50, 51)).toBe(true);
    expect(checkCondition(49, 'cross-below', 50, 49)).toBe(false);
    expect(checkCondition(51, 'cross-below', 50, 52)).toBe(false);
  });

  test('cross-below without previous falls back to <', () => {
    expect(checkCondition(49, 'cross-below', 50)).toBe(true);
    expect(checkCondition(51, 'cross-below', 50)).toBe(false);
  });

  test('unknown operator returns false', () => {
    expect(checkCondition(50, '!=', 50)).toBe(false);
    expect(checkCondition(50, 'in', 50)).toBe(false);
    expect(checkCondition(50, '', 50)).toBe(false);
  });

  test('handles zero values', () => {
    expect(checkCondition(0, '==', 0)).toBe(true);
    expect(checkCondition(0, '>', 0)).toBe(false);
    expect(checkCondition(0, '<', 0)).toBe(false);
  });

  test('handles negative values', () => {
    expect(checkCondition(-10, '<', 0)).toBe(true);
    expect(checkCondition(-10, '>', 0)).toBe(false);
    expect(checkCondition(-10, '==', -10)).toBe(true);
  });

  test('handles large values', () => {
    expect(checkCondition(1e18, '>', 1e17)).toBe(true);
    expect(checkCondition(1e18, '==', 1e18)).toBe(true);
  });

  test('handles decimal precision', () => {
    expect(checkCondition(1.000001, '>', 1.0)).toBe(true);
    expect(checkCondition(0.999999, '<', 1.0)).toBe(true);
  });
});
