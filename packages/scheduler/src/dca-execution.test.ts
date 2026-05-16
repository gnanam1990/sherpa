import { describe, test, expect, vi } from 'vitest';
import {
  executeDCA,
  buildSwapTransaction,
  recordExecution,
  BUILDER_CODE,
  MAX_CONSECUTIVE_FAILURES,
  type ExecutionResult,
  type SwapParams,
} from './dca-execution.js';
import { InMemoryDCAStore, type DCAScheduleRow } from '@sherpa/memory';

function makeSchedule(overrides: Partial<DCAScheduleRow> = {}): DCAScheduleRow {
  return {
    id: 'test-schedule-id',
    user_address: '0x1234567890123456789012345678901234567890',
    from_asset: { symbol: 'USDC' },
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
    next_execution_at: new Date().toISOString(),
    last_executed_at: null,
    ...overrides,
  };
}

describe('DCA execution', () => {
  describe('BUILDER_CODE', () => {
    test('is sherpa-dca-v1', () => {
      expect(BUILDER_CODE).toBe('sherpa-dca-v1');
    });
  });

  describe('MAX_CONSECUTIVE_FAILURES', () => {
    test('is 3', () => {
      expect(MAX_CONSECUTIVE_FAILURES).toBe(3);
    });
  });

  describe('buildSwapTransaction', () => {
    test('returns ok with txHash', async () => {
      const result = await buildSwapTransaction({
        fromAsset: { symbol: 'USDC' },
        toAsset: { symbol: 'ETH' },
        amountIn: '100',
        userAddress: '0x1234567890123456789012345678901234567890',
        builderCode: BUILDER_CODE,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.txHash).toMatch(/^0x[0-9a-f]{64}$/);
      }
    });
  });

  describe('recordExecution', () => {
    test('creates execution record', async () => {
      const store = new InMemoryDCAStore();
      const schedule = await store.createSchedule({
        userAddress: '0x1234567890123456789012345678901234567890',
        fromAsset: { symbol: 'USDC' },
        toAsset: { symbol: 'ETH' },
        amountPerTick: '100',
        frequency: 'daily',
        nextExecutionAt: new Date().toISOString(),
      });

      await recordExecution(store, {
        dcaScheduleId: schedule.id,
        amountIn: '100',
        status: 'success',
        txHash: '0xabc',
      });

      const executions = await store.getExecutions(schedule.id);
      expect(executions.length).toBe(1);
      expect(executions[0].status).toBe('success');
    });
  });

  describe('executeDCA', () => {
    test('successful execution logs and updates schedule', async () => {
      const store = new InMemoryDCAStore();
      const schedule = await store.createSchedule({
        userAddress: '0x1234567890123456789012345678901234567890',
        fromAsset: { symbol: 'USDC' },
        toAsset: { symbol: 'ETH' },
        amountPerTick: '100',
        frequency: 'daily',
        nextExecutionAt: new Date().toISOString(),
      });

      const mockSwap = vi.fn(async (): Promise<ExecutionResult> => ({
        ok: true,
        txHash: '0xabc123',
        amountOut: '0.05',
      }));

      const result = await executeDCA(schedule, {
        store,
        executeSwap: mockSwap,
      });

      expect(result.ok).toBe(true);
      expect(mockSwap).toHaveBeenCalledWith(expect.objectContaining({
        amountIn: '100',
        builderCode: BUILDER_CODE,
      }));

      const executions = await store.getExecutions(schedule.id);
      expect(executions.length).toBe(1);
      expect(executions[0].status).toBe('success');
      expect(executions[0].tx_hash).toBe('0xabc123');
    });

    test('failed execution increments failures', async () => {
      const store = new InMemoryDCAStore();
      const schedule = await store.createSchedule({
        userAddress: '0x1234567890123456789012345678901234567890',
        fromAsset: { symbol: 'USDC' },
        toAsset: { symbol: 'ETH' },
        amountPerTick: '100',
        frequency: 'daily',
        nextExecutionAt: new Date().toISOString(),
      });

      const mockSwap = vi.fn(async (): Promise<ExecutionResult> => ({
        ok: false,
        error: 'Insufficient balance',
      }));

      const result = await executeDCA(schedule, {
        store,
        executeSwap: mockSwap,
      });

      expect(result.ok).toBe(false);
      const updated = await store.getScheduleById(schedule.id);
      expect(updated!.consecutive_failures).toBe(1);
    });

    test('3 consecutive failures auto-pauses schedule', async () => {
      const store = new InMemoryDCAStore();
      const schedule = await store.createSchedule({
        userAddress: '0x1234567890123456789012345678901234567890',
        fromAsset: { symbol: 'USDC' },
        toAsset: { symbol: 'ETH' },
        amountPerTick: '100',
        frequency: 'daily',
        nextExecutionAt: new Date().toISOString(),
      });
      await store.updateSchedule(schedule.id, { consecutiveFailures: 2 });

      const reloaded = await store.getScheduleById(schedule.id);

      const mockSwap = vi.fn(async (): Promise<ExecutionResult> => ({
        ok: false,
        error: 'swap failed',
      }));

      await executeDCA(reloaded!, {
        store,
        executeSwap: mockSwap,
      });

      const updated = await store.getScheduleById(schedule.id);
      expect(updated!.status).toBe('paused');
    });

    test('sends notification on success', async () => {
      const store = new InMemoryDCAStore();
      const schedule = await store.createSchedule({
        userAddress: '0x1234567890123456789012345678901234567890',
        fromAsset: { symbol: 'USDC' },
        toAsset: { symbol: 'ETH' },
        amountPerTick: '100',
        frequency: 'daily',
        nextExecutionAt: new Date().toISOString(),
      });

      const notify = vi.fn(async () => {});
      const mockSwap = vi.fn(async (): Promise<ExecutionResult> => ({
        ok: true,
        txHash: '0xabc',
        amountOut: '0.05',
      }));

      await executeDCA(schedule, {
        store,
        executeSwap: mockSwap,
        notify,
      });

      expect(notify).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('DCA executed'),
      );
    });

    test('sends notification on failure', async () => {
      const store = new InMemoryDCAStore();
      const schedule = await store.createSchedule({
        userAddress: '0x1234567890123456789012345678901234567890',
        fromAsset: { symbol: 'USDC' },
        toAsset: { symbol: 'ETH' },
        amountPerTick: '100',
        frequency: 'daily',
        nextExecutionAt: new Date().toISOString(),
      });

      const notify = vi.fn(async () => {});
      const mockSwap = vi.fn(async (): Promise<ExecutionResult> => ({
        ok: false,
        error: 'insufficient balance',
      }));

      await executeDCA(schedule, {
        store,
        executeSwap: mockSwap,
        notify,
      });

      expect(notify).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('failed'),
      );
    });

    test('sends auto-pause notification at max failures', async () => {
      const store = new InMemoryDCAStore();
      const schedule = await store.createSchedule({
        userAddress: '0x1234567890123456789012345678901234567890',
        fromAsset: { symbol: 'USDC' },
        toAsset: { symbol: 'ETH' },
        amountPerTick: '100',
        frequency: 'daily',
        nextExecutionAt: new Date().toISOString(),
      });
      await store.updateSchedule(schedule.id, { consecutiveFailures: 2 });

      const reloaded = await store.getScheduleById(schedule.id);

      const notify = vi.fn(async () => {});
      const mockSwap = vi.fn(async (): Promise<ExecutionResult> => ({
        ok: false,
        error: 'swap failed',
      }));

      await executeDCA(reloaded!, {
        store,
        executeSwap: mockSwap,
        notify,
      });

      expect(notify).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('paused'),
      );
    });

    test('resets failures on success', async () => {
      const store = new InMemoryDCAStore();
      const schedule = await store.createSchedule({
        userAddress: '0x1234567890123456789012345678901234567890',
        fromAsset: { symbol: 'USDC' },
        toAsset: { symbol: 'ETH' },
        amountPerTick: '100',
        frequency: 'daily',
        nextExecutionAt: new Date().toISOString(),
      });
      await store.updateSchedule(schedule.id, { consecutiveFailures: 2 });

      const reloaded = await store.getScheduleById(schedule.id);

      const mockSwap = vi.fn(async (): Promise<ExecutionResult> => ({
        ok: true,
        txHash: '0xabc',
        amountOut: '0.05',
      }));

      await executeDCA(reloaded!, {
        store,
        executeSwap: mockSwap,
      });

      const updated = await store.getScheduleById(schedule.id);
      expect(updated!.consecutive_failures).toBe(0);
    });

    test('handles swap throwing exception', async () => {
      const store = new InMemoryDCAStore();
      const schedule = await store.createSchedule({
        userAddress: '0x1234567890123456789012345678901234567890',
        fromAsset: { symbol: 'USDC' },
        toAsset: { symbol: 'ETH' },
        amountPerTick: '100',
        frequency: 'daily',
        nextExecutionAt: new Date().toISOString(),
      });

      const mockSwap = vi.fn(async () => {
        throw new Error('Network timeout');
      });

      const result = await executeDCA(schedule, {
        store,
        executeSwap: mockSwap,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Network timeout');
      }
    });

    test('increments total executions on success', async () => {
      const store = new InMemoryDCAStore();
      const schedule = await store.createSchedule({
        userAddress: '0x1234567890123456789012345678901234567890',
        fromAsset: { symbol: 'USDC' },
        toAsset: { symbol: 'ETH' },
        amountPerTick: '100',
        frequency: 'daily',
        nextExecutionAt: new Date().toISOString(),
      });

      const mockSwap = vi.fn(async (): Promise<ExecutionResult> => ({
        ok: true,
        txHash: '0xabc',
        amountOut: '0.05',
      }));

      await executeDCA(schedule, { store, executeSwap: mockSwap });

      const updated = await store.getScheduleById(schedule.id);
      expect(updated!.total_executions).toBe(1);
    });
  });
});
