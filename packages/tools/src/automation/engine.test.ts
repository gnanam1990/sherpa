import { describe, test, expect } from 'vitest';
import { validateAutomation, evaluateCondition, executeAction } from './engine.js';

describe('Automation engine', () => {
  test('validateAutomation rejects missing name', () => {
    const errors = validateAutomation({});
    expect(errors.length).toBeGreaterThan(0);
  });

  test('validateAutomation accepts valid rule', () => {
    const errors = validateAutomation({
      name: 'test',
      condition: { type: 'price', operator: '>', value: '5000' },
      action: { type: 'SWAP', params: {} },
    });
    expect(errors.length).toBe(0);
  });

  test('evaluateCondition returns boolean', async () => {
    const result = await evaluateCondition(
      {
        id: '1',
        name: 'test',
        condition: { type: 'price', operator: '>', value: '5000' },
        action: { type: 'SWAP', params: {} },
        userId: '0x1234' as `0x${string}`,
        status: 'active',
        executionCount: 0,
      },
      { chainId: 8453 },
    );
    expect(typeof result).toBe('boolean');
  });

  test('executeAction fails closed until an executor is configured', async () => {
    const result = await executeAction(
      {
        id: '1',
        name: 'test',
        condition: { type: 'price', operator: '>', value: '5000' },
        action: { type: 'SWAP', params: {} },
        userId: '0x1234' as `0x${string}`,
        status: 'active',
        executionCount: 0,
      },
      { chainId: 8453 },
    );

    expect(result).toEqual({
      success: false,
      error: 'automation_execution_not_configured',
    });
  });
});
