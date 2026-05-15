import { describe, test, expect } from 'vitest';
import { orchestrate, validateOrchestration } from './orchestrator.js';

describe('Cross-chain orchestrator', () => {
  test('orchestrate returns orchestrated tx', async () => {
    const result = await orchestrate([
      { chain: 'base', action: 'bridge', protocol: 'across', estimatedTime: 120 },
      { chain: 'arbitrum', action: 'swap', protocol: 'camelot', estimatedTime: 30 },
    ]);
    expect(result.steps.length).toBe(2);
    expect(result.totalTime).toBe(150);
  });

  test('validateOrchestration rejects empty steps', () => {
    const errors = validateOrchestration([]);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('validateOrchestration rejects too many steps', () => {
    const steps = Array(6).fill({ chain: 'base', action: 'test', protocol: 'test', estimatedTime: 10 });
    const errors = validateOrchestration(steps);
    expect(errors.length).toBeGreaterThan(0);
  });
});
