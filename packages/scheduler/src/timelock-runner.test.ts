import { describe, test, expect } from 'vitest';
import { parseScheduledTime } from './timelock-runner.js';

describe('TimeLock runner', () => {
  test('parses "in 2 hours"', () => {
    const result = parseScheduledTime('in 2 hours');
    expect(result).toBeInstanceOf(Date);
    expect(result!.getTime()).toBeGreaterThan(Date.now() + 60 * 60 * 1000);
  });

  test('parses "in 30 minutes"', () => {
    const result = parseScheduledTime('in 30 minutes');
    expect(result).toBeInstanceOf(Date);
  });

  test('parses "in 1 day"', () => {
    const result = parseScheduledTime('in 1 day');
    expect(result).toBeInstanceOf(Date);
  });

  test('returns null for unparseable strings', () => {
    expect(parseScheduledTime('banana')).toBeNull();
  });
});
