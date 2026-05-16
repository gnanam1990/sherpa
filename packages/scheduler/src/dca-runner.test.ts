import { describe, test, expect, vi } from 'vitest';
import {
  calculateNextExecution,
  runDCATasks,
  checkEndCondition,
  sessionKeyNotConfigured,
  type DCAScheduleRow,
} from './dca-runner.js';
import { InMemoryDCAStore, type DCAStore } from '@sherpa/memory';
import type { ExecutionResult } from './dca-execution.js';

const mockSuccessSwap = vi.fn(async (): Promise<ExecutionResult> => ({
  ok: true,
  txHash: '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc123',
  amountOut: '0.05',
}));

// Injected balance checker for tests — simulates sufficient on-chain balance.
const mockBalanceOk = vi.fn(async () => ({ ok: true as const }));

function makeSchedule(overrides: Partial<DCAScheduleRow> = {}): DCAScheduleRow {
  return {
    id: 'test-schedule-id',
    user_address: '0x1234567890123456789012345678901234567890',
    from_asset: { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
    to_asset: { symbol: 'ETH' },
    amount_per_tick: '100',
    frequency: 'daily',
    day_of_week: null,
    day_of_month: null,
    hour_of_day: 12,
    status: 'active',
    total_budget: null,
    remaining_budget: null,
    total_executions: 0,
    max_executions: null,
    consecutive_failures: 0,
    end_condition: 'never',
    end_date: null,
    created_at: new Date().toISOString(),
    next_execution_at: new Date(Date.now() - 60000).toISOString(),
    last_executed_at: null,
    ...overrides,
  };
}

describe('DCA runner', () => {
  describe('calculateNextExecution', () => {
    test('daily', () => {
      const next = calculateNextExecution('daily');
      expect(next).toBeInstanceOf(Date);
      expect(next.getTime()).toBeGreaterThan(Date.now());
    });

    test('weekly on Monday', () => {
      const next = calculateNextExecution('weekly', 1);
      expect(next.getUTCDay()).toBe(1);
    });

    test('weekly on Friday', () => {
      const next = calculateNextExecution('weekly', 5);
      expect(next.getUTCDay()).toBe(5);
    });

    test('monthly on the 15th', () => {
      const next = calculateNextExecution('monthly', undefined, 15);
      expect(next.getUTCDate()).toBe(15);
    });

    test('monthly on the 1st', () => {
      const next = calculateNextExecution('monthly', undefined, 1);
      expect(next.getUTCDate()).toBe(1);
    });

    test('biweekly', () => {
      const next = calculateNextExecution('biweekly', 1);
      expect(next).toBeInstanceOf(Date);
      expect(next.getTime()).toBeGreaterThan(Date.now());
    });

    test('respects hourOfDay', () => {
      const next = calculateNextExecution('daily', undefined, undefined, 18);
      expect(next.getUTCHours()).toBe(18);
    });

    test('default hourOfDay is 12', () => {
      const next = calculateNextExecution('daily');
      expect(next.getUTCHours()).toBe(12);
    });

    test('next execution is always in the future', () => {
      const next = calculateNextExecution('daily');
      expect(next.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('checkEndCondition', () => {
    test('returns false for never end condition', () => {
      const schedule = makeSchedule({ end_condition: 'never' });
      expect(checkEndCondition(schedule)).toBe(false);
    });

    test('returns true when max executions reached', () => {
      const schedule = makeSchedule({
        end_condition: 'count',
        max_executions: 10,
        total_executions: 10,
      });
      expect(checkEndCondition(schedule)).toBe(true);
    });

    test('returns false when max executions not reached', () => {
      const schedule = makeSchedule({
        end_condition: 'count',
        max_executions: 10,
        total_executions: 5,
      });
      expect(checkEndCondition(schedule)).toBe(false);
    });

    test('returns true when end date passed', () => {
      const schedule = makeSchedule({
        end_condition: 'date',
        end_date: new Date(Date.now() - 86400000).toISOString(),
      });
      expect(checkEndCondition(schedule)).toBe(true);
    });

    test('returns false when end date not passed', () => {
      const schedule = makeSchedule({
        end_condition: 'date',
        end_date: new Date(Date.now() + 86400000).toISOString(),
      });
      expect(checkEndCondition(schedule)).toBe(false);
    });

    test('returns true when remaining budget is zero', () => {
      const schedule = makeSchedule({
        total_budget: '1000',
        remaining_budget: '0',
      });
      expect(checkEndCondition(schedule)).toBe(true);
    });

    test('returns false when remaining budget is positive', () => {
      const schedule = makeSchedule({
        total_budget: '1000',
        remaining_budget: '500',
      });
      expect(checkEndCondition(schedule)).toBe(false);
    });
  });

  describe('runDCATasks', () => {
    test('returns ok with no schedules', async () => {
      const store = new InMemoryDCAStore();
      const log = { error: vi.fn() };
      const result = await runDCATasks({ log }, store);
      expect(result.ok).toBe(true);
      expect(result.detail).toContain('0 executed');
    });

    test('executes due schedule with injected executeSwap', async () => {
      const store = new InMemoryDCAStore();
      const created = await store.createSchedule({
        userAddress: '0x1234567890123456789012345678901234567890',
        fromAsset: { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
        toAsset: { symbol: 'ETH' },
        amountPerTick: '100',
        frequency: 'daily',
        nextExecutionAt: new Date(Date.now() - 60000).toISOString(),
      });

      const log = { error: vi.fn() };
      const result = await runDCATasks({ log }, store, mockSuccessSwap, mockBalanceOk);
      expect(result.ok).toBe(true);
      expect(result.detail).toContain('1 executed');

      const updated = await store.getScheduleById(created.id);
      expect(updated!.total_executions).toBe(1);
      expect(updated!.consecutive_failures).toBe(0);
    });

    test('without executeSwap defaults to session_key_not_configured error', async () => {
      const store = new InMemoryDCAStore();
      await store.createSchedule({
        userAddress: '0x1234567890123456789012345678901234567890',
        fromAsset: { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
        toAsset: { symbol: 'ETH' },
        amountPerTick: '100',
        frequency: 'daily',
        nextExecutionAt: new Date(Date.now() - 60000).toISOString(),
      });

      const log = { error: vi.fn() };
      const result = await runDCATasks({ log }, store, sessionKeyNotConfigured, mockBalanceOk);
      expect(result.ok).toBe(true);
      // No fake success: the schedule fails because session key not configured
      expect(result.detail).toContain('1 failed');
      expect(result.detail).not.toContain('1 executed');
    });

    test('skips schedules with max failures', async () => {
      const store = new InMemoryDCAStore();
      const created = await store.createSchedule({
        userAddress: '0x1234567890123456789012345678901234567890',
        fromAsset: { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
        toAsset: { symbol: 'ETH' },
        amountPerTick: '100',
        frequency: 'daily',
        nextExecutionAt: new Date(Date.now() - 60000).toISOString(),
      });

      await store.updateSchedule(created.id, { consecutiveFailures: 3 });

      const log = { error: vi.fn() };
      const result = await runDCATasks({ log }, store);
      expect(result.ok).toBe(true);
      expect(result.detail).toContain('1 skipped');
    });

    test('skips completed schedules', async () => {
      const store = new InMemoryDCAStore();
      await store.createSchedule({
        userAddress: '0x1234567890123456789012345678901234567890',
        fromAsset: { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
        toAsset: { symbol: 'ETH' },
        amountPerTick: '100',
        frequency: 'daily',
        endCondition: 'count',
        maxExecutions: 1,
        nextExecutionAt: new Date(Date.now() - 60000).toISOString(),
      });

      const schedules = await store.getDueSchedules(new Date().toISOString());
      for (const s of schedules) {
        await store.updateSchedule(s.id, { totalExecutions: 1 });
      }

      const log = { error: vi.fn() };
      const result = await runDCATasks({ log }, store);
      expect(result.ok).toBe(true);
    });

    test('handles execution errors gracefully', async () => {
      const store = new InMemoryDCAStore();
      await store.createSchedule({
        userAddress: '0x1234567890123456789012345678901234567890',
        fromAsset: { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
        toAsset: { symbol: 'ETH' },
        amountPerTick: '100',
        frequency: 'daily',
        nextExecutionAt: new Date(Date.now() - 60000).toISOString(),
      });

      const failingStore: DCAStore = {
        ...store,
        getDueSchedules: async () => {
          throw new Error('DB error');
        },
      };

      const log = { error: vi.fn() };
      const result = await runDCATasks({ log }, failingStore);
      expect(result.ok).toBe(false);
    });

    test('multiple schedules processed independently', async () => {
      const store = new InMemoryDCAStore();
      await store.createSchedule({
        userAddress: '0x1234567890123456789012345678901234567890',
        fromAsset: { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
        toAsset: { symbol: 'ETH' },
        amountPerTick: '100',
        frequency: 'daily',
        nextExecutionAt: new Date(Date.now() - 60000).toISOString(),
      });
      await store.createSchedule({
        userAddress: '0x1234567890123456789012345678901234567890',
        fromAsset: { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
        toAsset: { symbol: 'AERO' },
        amountPerTick: '50',
        frequency: 'weekly',
        nextExecutionAt: new Date(Date.now() - 60000).toISOString(),
      });

      const log = { error: vi.fn() };
      const result = await runDCATasks({ log }, store, mockSuccessSwap, mockBalanceOk);
      expect(result.ok).toBe(true);
      expect(result.detail).toContain('2 executed');
    });

    test('updates next execution after successful run', async () => {
      const store = new InMemoryDCAStore();
      const created = await store.createSchedule({
        userAddress: '0x1234567890123456789012345678901234567890',
        fromAsset: { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
        toAsset: { symbol: 'ETH' },
        amountPerTick: '100',
        frequency: 'daily',
        nextExecutionAt: new Date(Date.now() - 60000).toISOString(),
      });

      const log = { error: vi.fn() };
      await runDCATasks({ log }, store, mockSuccessSwap, mockBalanceOk);

      const updated = await store.getScheduleById(created.id);
      expect(new Date(updated!.next_execution_at).getTime()).toBeGreaterThan(Date.now());
    });
  });
});
