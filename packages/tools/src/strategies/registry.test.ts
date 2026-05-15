import { describe, test, expect } from 'vitest';
import { listStrategies, getStrategy } from './registry.js';

describe('Strategy registry', () => {
  test('listStrategies returns mock strategies', async () => {
    const strategies = await listStrategies();
    expect(strategies.length).toBeGreaterThan(0);
  });

  test('getStrategy returns strategy by id', async () => {
    const strategy = await getStrategy('dca-eth-weekly');
    expect(strategy).toBeDefined();
    expect(strategy?.name).toContain('DCA');
  });

  test('getStrategy returns null for unknown id', async () => {
    const strategy = await getStrategy('nonexistent');
    expect(strategy).toBeNull();
  });
});
