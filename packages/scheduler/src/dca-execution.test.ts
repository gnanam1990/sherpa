import { describe, test, expect, vi } from 'vitest';
import {
  executeDCA,
  buildSwapTransaction,
  recordExecution,
  BUILDER_CODE,
  MAX_CONSECUTIVE_FAILURES,
  type ExecutionResult,
} from './dca-execution.js';
import { InMemoryDCAStore } from '@sherpa/memory';

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
    test('throws — no fake on-chain success', async () => {
      await expect(
        buildSwapTransaction({
          fromAsset: { symbol: 'USDC' },
          toAsset: { symbol: 'ETH' },
          amountIn: '100',
          userAddress: '0x1234567890123456789012345678901234567890',
          builderCode: BUILDER_CODE,
        }),
      ).rejects.toThrow('scaffold placeholder');
    });
  });

  describe('executeDCA without executeSwap', () => {
    test('throws — refusing to fake success', async () => {
      const store = new InMemoryDCAStore();
      const schedule = await store.createSchedule({
        userAddress: '0x1234567890123456789012345678901234567890',
        fromAsset: { symbol: 'USDC' },
        toAsset: { symbol: 'ETH' },
        amountPerTick: '100',
        frequency: 'daily',
        nextExecutionAt: new Date().toISOString(),
      });

      await expect(
        executeDCA(schedule, { store }),
      ).rejects.toThrow('executeSwap function required');
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
